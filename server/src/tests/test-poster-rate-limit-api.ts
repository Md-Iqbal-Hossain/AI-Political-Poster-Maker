import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { User } from '../models/user.model.js';
import { Template } from '../models/template.model.js';
import { generateToken } from '../utils/jwt.js';
import cloudinary from '../services/cloudinary.service.js';
import { resetPosterRateLimitStore } from '../middlewares/rate-limit.middleware.js';

async function runPosterRateLimitApiTest() {
  console.log('=== TEST: Poster Generation Rate Limiting (5 Requests / 15 Mins Per User) ===');

  let mongoServer: MongoMemoryServer | null = null;

  try {
    // Reset rate limiter store at start of test
    resetPosterRateLimitStore();

    // 1. Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✓ In-memory MongoDB connected successfully.');

    // 2. Create seed Users & Template
    const user1 = await User.create({
      name: 'Rate Limit User 1',
      email: 'ratelimit1@test.com',
      passwordHash: 'hash_1',
      role: 'user',
    });

    const user2 = await User.create({
      name: 'Rate Limit User 2',
      email: 'ratelimit2@test.com',
      passwordHash: 'hash_2',
      role: 'user',
    });

    const tokenUser1 = generateToken({
      userId: user1._id.toString(),
      email: user1.email,
      role: user1.role,
    });

    const tokenUser2 = generateToken({
      userId: user2._id.toString(),
      email: user2.email,
      role: user2.role,
    });

    const template = await Template.create({
      name: 'Test Poster Template',
      occasion: 'test-event',
      previewUrl: 'https://placehold.co/600x800.png',
      layoutConfig: { canvas: { width: 1080, height: 1350 } },
      isActive: true,
    });

    // 3. Stub Cloudinary upload_stream
    cloudinary.uploader.upload_stream = ((options: any, callback: any) => {
      setTimeout(() => {
        if (callback) {
          callback(null, {
            secure_url: 'https://res.cloudinary.com/test/image/upload/v1/test.png',
            public_id: 'test_public_id',
          });
        }
      }, 5);

      return {
        end: (buffer: Buffer) => {},
      } as any;
    }) as any;

    const validPayload = {
      templateId: template._id.toString(),
      occasion: 'বিজয় দিবস',
      headline: 'রেট লিমিট টেস্ট শিরোনাম',
      name: 'ইউজার ১',
      designation: 'সাধারণ সদস্য',
      party: 'ছাত্র ফ্রন্ট',
      location: 'ঢাকা',
    };

    // TEST 1: Unauthenticated request should return 401 (not 429)
    console.log('\n--- 1. Testing Unauthenticated Request ---');
    const resUnauth = await request(app)
      .post('/api/posters/generate')
      .send(validPayload);

    console.log('Status Code:', resUnauth.status, 'Message:', resUnauth.body.message);
    if (resUnauth.status !== 401 || resUnauth.body.success !== false) {
      throw new Error('Unauthenticated request was not rejected with HTTP 401!');
    }
    console.log('✓ 401 Unauthorized check passed for unauthenticated request.');

    // TEST 2: User 1 makes 5 consecutive generation requests -> All 5 succeed (HTTP 201)
    console.log('\n--- 2. Testing User 1 Making 5 Consecutive Requests (Within Limit) ---');
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post('/api/posters/generate')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(validPayload);

      console.log(`Request #${i} Status Code:`, res.status, 'Poster ID:', res.body.data?.posterId);
      if (res.status !== 201 || !res.body.success) {
        throw new Error(`Request #${i} for User 1 within limit of 5 failed unexpectedly with status ${res.status}`);
      }
    }
    console.log('✓ First 5 requests for User 1 succeeded with HTTP 201.');

    // TEST 3: User 1 makes 6th request within 15 mins -> Blocked with HTTP 429
    console.log('\n--- 3. Testing User 1 Making 6th Request (Exceeding Limit) ---');
    const res6th = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send(validPayload);

    console.log('6th Request Status Code:', res6th.status);
    console.log('6th Request Body:', res6th.body);

    if (res6th.status !== 429 || res6th.body.success !== false) {
      throw new Error('6th request for User 1 was not blocked with HTTP 429 Rate Limit Exceeded!');
    }
    if (!res6th.body.message?.includes('5 poster generations per 15 minutes')) {
      throw new Error(`Rate limit error message did not contain expected text. Got: "${res6th.body.message}"`);
    }
    console.log('✓ 6th request for User 1 successfully blocked with HTTP 429.');

    // TEST 4: User 2 (different authenticated user) makes a request -> Succeeds (Separate User Limit)
    console.log('\n--- 4. Testing User 2 (Different User) Limits Are Isolated ---');
    const resUser2 = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${tokenUser2}`)
      .send(validPayload);

    console.log('User 2 Request Status Code:', resUser2.status, 'Poster ID:', resUser2.body.data?.posterId);
    if (resUser2.status !== 201 || !resUser2.body.success) {
      throw new Error('User 2 request failed! Rate limit was inappropriately shared across users.');
    }
    console.log('✓ User 2 request succeeded with HTTP 201 (Per-user rate limit isolation verified).');

    // TEST 5: Verify non-generation routes are NOT blocked for User 1
    console.log('\n--- 5. Testing Non-Generation Endpoints Are Not Rate Limited ---');
    // 5a. GET /api/posters (History)
    const resHistory = await request(app)
      .get('/api/posters')
      .set('Authorization', `Bearer ${tokenUser1}`);
    console.log('History GET Status Code:', resHistory.status, 'Total Posters:', resHistory.body.pagination?.total);
    if (resHistory.status !== 200 || !resHistory.body.success) {
      throw new Error('History endpoint was wrongly blocked by poster generation rate limit!');
    }

    // 5b. POST /api/uploads/image (Uploads)
    const dummyBuffer = Buffer.from('fake image');
    const resUpload = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .attach('images', dummyBuffer, 'test.jpg');
    console.log('Upload POST Status Code:', resUpload.status);
    if (resUpload.status !== 200 || !resUpload.body.success) {
      throw new Error('Upload endpoint was wrongly blocked by poster generation rate limit!');
    }
    console.log('✓ History and Upload endpoints are not affected by poster generation rate limiting.');

    console.log('\nAll Poster Generation Rate Limiting tests passed successfully!');
  } catch (error: any) {
    console.error('Rate Limit Test failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    resetPosterRateLimitStore();
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    process.exit(process.exitCode || 0);
  }
}

runPosterRateLimitApiTest();
