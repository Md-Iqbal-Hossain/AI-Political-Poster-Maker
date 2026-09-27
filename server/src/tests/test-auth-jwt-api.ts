import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { User } from '../models/user.model.js';
import { generateToken } from '../utils/jwt.js';
import { ENV } from '../config/env.js';

async function runAuthJwtApiTest() {
  console.log('=== TEST: Authentication Middleware & JWT Edge Cases ===');

  let mongoServer: MongoMemoryServer | null = null;

  try {
    // 1. Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✓ In-memory MongoDB connected successfully.');

    // 2. Create seed User
    const testUser = await User.create({
      name: 'Auth Test Candidate',
      email: 'auth_candidate@test.com',
      passwordHash: 'hashed_password_123',
      role: 'user',
    });

    const userPayload = {
      userId: testUser._id.toString(),
      email: testUser.email,
      role: testUser.role,
    };

    // 3. Generate test JWT tokens
    const validToken = generateToken(userPayload);
    const expiredToken = jwt.sign(userPayload, ENV.JWT_SECRET, { expiresIn: '-1s' });
    const tamperedToken = jwt.sign(userPayload, 'completely_wrong_secret_key_999');
    const malformedToken = 'not.a.valid.jwt.structure';

    // TEST 1: No Token (missing both Cookie & Authorization header) -> 401
    console.log('\n--- 1. Testing Missing Token (No Cookie or Header) ---');
    const res1 = await request(app).get('/api/posters');
    console.log('Status Code:', res1.status, 'Message:', res1.body.message);
    if (res1.status !== 401 || res1.body.success !== false) {
      throw new Error('Missing token request was not rejected with 401!');
    }
    console.log('✓ 401 Unauthorized check passed for missing token.');

    // TEST 2: Malformed JWT Token -> 401
    console.log('\n--- 2. Testing Malformed JWT Token ---');
    const res2 = await request(app)
      .get('/api/posters')
      .set('Authorization', `Bearer ${malformedToken}`);
    console.log('Status Code:', res2.status, 'Message:', res2.body.message);
    if (res2.status !== 401 || res2.body.success !== false) {
      throw new Error('Malformed token request was not rejected with 401!');
    }
    console.log('✓ 401 Unauthorized check passed for malformed token.');

    // TEST 3: Invalid / Tampered Signature JWT Token -> 401
    console.log('\n--- 3. Testing Tampered Signature JWT Token ---');
    const res3 = await request(app)
      .get('/api/posters')
      .set('Authorization', `Bearer ${tamperedToken}`);
    console.log('Status Code:', res3.status, 'Message:', res3.body.message);
    if (res3.status !== 401 || res3.body.success !== false) {
      throw new Error('Tampered signature token request was not rejected with 401!');
    }
    console.log('✓ 401 Unauthorized check passed for tampered signature token.');

    // TEST 4: Expired JWT Token -> 401
    console.log('\n--- 4. Testing Expired JWT Token ---');
    const res4 = await request(app)
      .get('/api/posters')
      .set('Authorization', `Bearer ${expiredToken}`);
    console.log('Status Code:', res4.status, 'Message:', res4.body.message);
    if (res4.status !== 401 || res4.body.success !== false) {
      throw new Error('Expired token request was not rejected with 401!');
    }
    console.log('✓ 401 Unauthorized check passed for expired token.');

    // TEST 5: Valid Authorization Bearer Token -> 200 OK
    console.log('\n--- 5. Testing Valid Authorization Bearer Header Token ---');
    const res5 = await request(app)
      .get('/api/posters')
      .set('Authorization', `Bearer ${validToken}`);
    console.log('Status Code:', res5.status);
    if (res5.status !== 200 || res5.body.success !== true) {
      throw new Error('Valid Bearer header token request failed!');
    }
    console.log('✓ 200 OK check passed for valid Bearer token header.');

    // TEST 6: Valid HTTP-Only Cookie Token -> 200 OK
    console.log('\n--- 6. Testing Valid HTTP-Only Cookie Token ---');
    const res6 = await request(app)
      .get('/api/posters')
      .set('Cookie', [`token=${validToken}`]);
    console.log('Status Code:', res6.status);
    if (res6.status !== 200 || res6.body.success !== true) {
      throw new Error('Valid Cookie token request failed!');
    }
    console.log('✓ 200 OK check passed for valid Cookie token.');

    // TEST 7: Cookie vs Header Precedence (Valid Cookie + Invalid Header -> 200 OK)
    console.log('\n--- 7. Testing Cookie vs Header Precedence ---');
    const res7 = await request(app)
      .get('/api/posters')
      .set('Cookie', [`token=${validToken}`])
      .set('Authorization', `Bearer ${tamperedToken}`);
    console.log('Status Code:', res7.status);
    if (res7.status !== 200 || res7.body.success !== true) {
      throw new Error('Valid cookie should take precedence and pass!');
    }
    console.log('✓ Cookie precedence check passed.');

    console.log('\nAll Authentication Middleware & JWT Edge Case tests passed successfully!');
  } catch (error: any) {
    console.error('Auth API Test failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    process.exit(process.exitCode || 0);
  }
}

runAuthJwtApiTest();
