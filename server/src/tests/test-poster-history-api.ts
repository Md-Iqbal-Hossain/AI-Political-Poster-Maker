import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { User } from '../models/user.model.js';
import { Template } from '../models/template.model.js';
import { Poster } from '../models/poster.model.js';
import { generateToken } from '../utils/jwt.js';

async function runPosterHistoryApiTest() {
  console.log('=== TEST: Poster History API Endpoint Pagination & User Isolation (GET /api/posters) ===');

  let mongoServer: MongoMemoryServer | null = null;

  try {
    // 1. Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✓ In-memory MongoDB connected successfully.');

    // 2. Create User A, User B, and User C (User C has no posters)
    const userA = await User.create({
      name: 'User Alpha',
      email: 'usera@test.com',
      passwordHash: 'hash_a',
      role: 'user',
    });

    const userB = await User.create({
      name: 'User Beta',
      email: 'userb@test.com',
      passwordHash: 'hash_b',
      role: 'user',
    });

    const userC = await User.create({
      name: 'User Gamma',
      email: 'userc@test.com',
      passwordHash: 'hash_c',
      role: 'user',
    });

    const tokenA = generateToken({
      userId: userA._id.toString(),
      email: userA.email,
      role: userA.role,
    });

    const tokenB = generateToken({
      userId: userB._id.toString(),
      email: userB.email,
      role: userB.role,
    });

    const tokenC = generateToken({
      userId: userC._id.toString(),
      email: userC.email,
      role: userC.role,
    });

    // 3. Create dummy template
    const template = await Template.create({
      name: 'Victory Poster',
      occasion: 'victory-day',
      previewUrl: 'https://placehold.co/600x800.png',
      isActive: true,
    });

    // 4. Create 3 posters for User A (at different timestamps to test newest-first sorting)
    const baseDate = Date.now();
    
    await Poster.create({
      userId: userA._id,
      templateId: template._id,
      occasion: 'বিজয় দিবস',
      headline: 'পোস্টার ১ - পুরোনো',
      name: 'ইউজার এ',
      designation: 'সদস্য',
      party: 'দল এ',
      location: 'ঢাকা',
      generatedImageUrl: 'https://cloudinary.com/posterA1.png',
      generatedImagePublicId: 'posterA1_id',
      layout: {
        backgroundColor: '#004D40',
        accentColor: '#FFD700',
        photoPlacement: 'center-circle',
        headlinePlacement: 'below-photo',
        decorativeStyle: 'patriotic-flag',
      },
      createdAt: new Date(baseDate - 10000), // 10s ago
    });

    await Poster.create({
      userId: userA._id,
      templateId: template._id,
      occasion: 'বিজয় দিবস',
      headline: 'পোস্টার ২ - মাঝারি',
      name: 'ইউজার এ',
      designation: 'সদস্য',
      party: 'দল এ',
      location: 'ঢাকা',
      generatedImageUrl: 'https://cloudinary.com/posterA2.png',
      generatedImagePublicId: 'posterA2_id',
      layout: {
        backgroundColor: '#004D40',
        accentColor: '#FFD700',
        photoPlacement: 'center-circle',
        headlinePlacement: 'below-photo',
        decorativeStyle: 'patriotic-flag',
      },
      createdAt: new Date(baseDate - 5000), // 5s ago
    });

    await Poster.create({
      userId: userA._id,
      templateId: template._id,
      occasion: 'বিজয় দিবস',
      headline: 'পোস্টার ৩ - নতুন',
      name: 'ইউজার এ',
      designation: 'সদস্য',
      party: 'দল এ',
      location: 'ঢাকা',
      generatedImageUrl: 'https://cloudinary.com/posterA3.png',
      generatedImagePublicId: 'posterA3_id',
      layout: {
        backgroundColor: '#004D40',
        accentColor: '#FFD700',
        photoPlacement: 'center-circle',
        headlinePlacement: 'below-photo',
        decorativeStyle: 'patriotic-flag',
      },
      createdAt: new Date(baseDate), // Latest
    });

    // Create 1 poster for User B
    const posterB1 = await Poster.create({
      userId: userB._id,
      templateId: template._id,
      occasion: 'ঈদ',
      headline: 'ইউজার বি এর পোস্টার',
      name: 'ইউজার বি',
      designation: 'সদস্য',
      party: 'দল বি',
      location: 'সিলেট',
      generatedImageUrl: 'https://cloudinary.com/posterB1.png',
      generatedImagePublicId: 'posterB1_id',
      layout: {
        backgroundColor: '#0B5345',
        accentColor: '#D4AC0D',
        photoPlacement: 'center-circle',
        headlinePlacement: 'below-photo',
        decorativeStyle: 'festive-crescent',
      },
      createdAt: new Date(baseDate),
    });

    console.log('✓ Test Database seeded with User A (3 posters), User B (1 poster), and User C (0 posters).');

    // TEST 1: Unauthenticated request -> 401
    console.log('\n--- 1. Testing Unauthenticated GET /api/posters ---');
    const res1 = await request(app).get('/api/posters');
    console.log('Status Code:', res1.status);
    if (res1.status !== 401 || res1.body.success !== false) {
      throw new Error('Unauthenticated request was not rejected with 401!');
    }
    console.log('✓ 401 Unauthorized check passed.');

    // TEST 2: Default Pagination & User Isolation (User A)
    console.log('\n--- 2. Testing Default Pagination & User Isolation (User A) ---');
    const res2 = await request(app)
      .get('/api/posters')
      .set('Authorization', `Bearer ${tokenA}`);

    console.log('Status Code:', res2.status);
    console.log('Pagination Metadata:', res2.body.pagination);

    if (
      res2.status !== 200 ||
      res2.body.success !== true ||
      res2.body.pagination.page !== 1 ||
      res2.body.pagination.limit !== 10 ||
      res2.body.pagination.total !== 3 ||
      res2.body.pagination.totalPages !== 1 ||
      res2.body.data.length !== 3
    ) {
      throw new Error('User A default pagination response structure incorrect!');
    }

    // Verify User B's poster is NOT returned to User A
    const hasPosterB = res2.body.data.some((p: any) => p._id === posterB1._id.toString());
    if (hasPosterB) {
      throw new Error('User B poster was leaked to User A!');
    }
    console.log('✓ Default pagination and User Isolation checks passed.');

    // TEST 3: Newest First Ordering
    console.log('\n--- 3. Testing Newest-First Ordering ---');
    const returnedHeadlines = res2.body.data.map((p: any) => p.headline);
    console.log('Returned Headlines Order:', returnedHeadlines);

    if (
      returnedHeadlines[0] !== 'পোস্টার ৩ - নতুন' ||
      returnedHeadlines[1] !== 'পোস্টার ২ - মাঝারি' ||
      returnedHeadlines[2] !== 'পোস্টার ১ - পুরোনো'
    ) {
      throw new Error('Posters were not returned in newest-first order!');
    }
    console.log('✓ Newest-First Ordering check passed.');

    // TEST 4: Valid Custom Pagination (limit=2, page=1 and page=2)
    console.log('\n--- 4. Testing Valid Custom Pagination (page=1&limit=2) ---');
    const resPage1 = await request(app)
      .get('/api/posters?page=1&limit=2')
      .set('Authorization', `Bearer ${tokenA}`);

    if (
      resPage1.body.pagination.page !== 1 ||
      resPage1.body.pagination.limit !== 2 ||
      resPage1.body.pagination.total !== 3 ||
      resPage1.body.pagination.totalPages !== 2 ||
      resPage1.body.data.length !== 2
    ) {
      throw new Error('Page 1 pagination metadata or item count incorrect!');
    }

    const resPage2 = await request(app)
      .get('/api/posters?page=2&limit=2')
      .set('Authorization', `Bearer ${tokenA}`);

    if (resPage2.body.data.length !== 1 || resPage2.body.data[0].headline !== 'পোস্টার ১ - পুরোনো') {
      throw new Error('Page 2 pagination data incorrect!');
    }
    console.log('✓ Custom Pagination check passed.');

    // TEST 5: Maximum Limit of 50 Boundary
    console.log('\n--- 5. Testing Maximum Limit (limit=50 accepted, limit=51 rejected) ---');
    const resMaxValid = await request(app)
      .get('/api/posters?limit=50')
      .set('Authorization', `Bearer ${tokenA}`);
    console.log('limit=50 Status Code:', resMaxValid.status);
    if (resMaxValid.status !== 200 || resMaxValid.body.pagination.limit !== 50) {
      throw new Error('limit=50 (maximum allowed limit) was incorrectly rejected!');
    }

    const resMaxExceeded = await request(app)
      .get('/api/posters?limit=51')
      .set('Authorization', `Bearer ${tokenA}`);
    console.log('limit=51 Status Code:', resMaxExceeded.status);
    if (resMaxExceeded.status !== 400 || resMaxExceeded.body.success !== false) {
      throw new Error('limit=51 (exceeding maximum 50) was not rejected with 400!');
    }
    console.log('✓ Maximum Limit (50) boundary checks passed.');

    // TEST 6: Invalid Pagination Edge Cases -> 400 Bad Request
    console.log('\n--- 6. Testing Invalid Pagination Edge Cases (-1, -5, 0, decimals, non-numeric) ---');

    // 6a. Negative page: ?page=-1
    const resNegPage = await request(app)
      .get('/api/posters?page=-1')
      .set('Authorization', `Bearer ${tokenA}`);
    console.log('?page=-1 Status:', resNegPage.status, 'Message:', resNegPage.body.message);
    if (resNegPage.status !== 400 || resNegPage.body.success !== false) {
      throw new Error('page=-1 was not rejected with 400!');
    }

    // 6b. Negative limit: ?limit=-5
    const resNegLimit = await request(app)
      .get('/api/posters?limit=-5')
      .set('Authorization', `Bearer ${tokenA}`);
    console.log('?limit=-5 Status:', resNegLimit.status, 'Message:', resNegLimit.body.message);
    if (resNegLimit.status !== 400 || resNegLimit.body.success !== false) {
      throw new Error('limit=-5 was not rejected with 400!');
    }

    // 6c. Zero limit: ?limit=0
    const resZeroLimit = await request(app)
      .get('/api/posters?limit=0')
      .set('Authorization', `Bearer ${tokenA}`);
    console.log('?limit=0 Status:', resZeroLimit.status, 'Message:', resZeroLimit.body.message);
    if (resZeroLimit.status !== 400 || resZeroLimit.body.success !== false) {
      throw new Error('limit=0 was not rejected with 400!');
    }

    // 6d. Decimal page: ?page=1.5
    const resDecPage = await request(app)
      .get('/api/posters?page=1.5')
      .set('Authorization', `Bearer ${tokenA}`);
    console.log('?page=1.5 Status:', resDecPage.status, 'Message:', resDecPage.body.message);
    if (resDecPage.status !== 400 || resDecPage.body.success !== false) {
      throw new Error('page=1.5 was not rejected with 400!');
    }

    // 6e. Decimal limit: ?limit=2.5
    const resDecLimit = await request(app)
      .get('/api/posters?limit=2.5')
      .set('Authorization', `Bearer ${tokenA}`);
    console.log('?limit=2.5 Status:', resDecLimit.status, 'Message:', resDecLimit.body.message);
    if (resDecLimit.status !== 400 || resDecLimit.body.success !== false) {
      throw new Error('limit=2.5 was not rejected with 400!');
    }

    // 6f. Non-numeric page: ?page=abc
    const resAbcPage = await request(app)
      .get('/api/posters?page=abc')
      .set('Authorization', `Bearer ${tokenA}`);
    console.log('?page=abc Status:', resAbcPage.status);
    if (resAbcPage.status !== 400 || resAbcPage.body.success !== false) {
      throw new Error('page=abc was not rejected with 400!');
    }

    console.log('✓ All 400 Bad Request checks passed for invalid pagination edge cases.');

    // TEST 7: Empty History for Authenticated User (User C) -> 200 OK & empty array
    console.log('\n--- 7. Testing Empty History for Authenticated User (User C) ---');
    const resUserC = await request(app)
      .get('/api/posters')
      .set('Authorization', `Bearer ${tokenC}`);

    console.log('User C Status Code:', resUserC.status);
    console.log('User C Response Body:', JSON.stringify(resUserC.body, null, 2));

    if (
      resUserC.status !== 200 ||
      resUserC.body.success !== true ||
      !Array.isArray(resUserC.body.data) ||
      resUserC.body.data.length !== 0 ||
      resUserC.body.pagination.total !== 0 ||
      resUserC.body.pagination.totalPages !== 0 ||
      resUserC.body.pagination.page !== 1 ||
      resUserC.body.pagination.limit !== 10
    ) {
      throw new Error('Empty history response structure for User C was incorrect!');
    }
    console.log('✓ 200 OK Empty History check passed for User C.');

    console.log('\nAll Poster History API endpoint tests passed successfully!');
  } catch (error: any) {
    console.error('History API Test failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    process.exit(process.exitCode || 0);
  }
}

runPosterHistoryApiTest();
