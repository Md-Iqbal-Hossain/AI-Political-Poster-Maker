import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { User } from '../models/user.model.js';
import { Template } from '../models/template.model.js';
import { Poster } from '../models/poster.model.js';
import { generateToken } from '../utils/jwt.js';

async function runPosterHistoryApiTest() {
  console.log('=== TEST: Poster History API Endpoint (GET /api/posters) ===');

  let mongoServer: MongoMemoryServer | null = null;

  try {
    // 1. Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✓ In-memory MongoDB connected successfully.');

    // 2. Create User A and User B
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

    // 3. Create dummy template
    const template = await Template.create({
      name: 'Victory Poster',
      occasion: 'victory-day',
      previewUrl: 'https://placehold.co/600x800.png',
      isActive: true,
    });

    // 4. Create 3 posters for User A (at different timestamps to test newest-first sorting)
    const baseDate = Date.now();
    
    const posterA1 = await Poster.create({
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

    const posterA2 = await Poster.create({
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

    const posterA3 = await Poster.create({
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

    console.log('✓ Test Database seeded with User A (3 posters) and User B (1 poster).');

    // TEST 1: Unauthenticated request -> 401
    console.log('\n--- 1. Testing Unauthenticated GET /api/posters ---');
    const res1 = await request(app).get('/api/posters');
    console.log('Status Code:', res1.status);
    if (res1.status !== 401 || res1.body.success !== false) {
      throw new Error('Unauthenticated request was not rejected with 401!');
    }
    console.log('✓ 401 Unauthorized check passed.');

    // TEST 2: User Isolation - User A gets ONLY User A's posters (3 total)
    console.log('\n--- 2. Testing User Isolation (User A) ---');
    const res2 = await request(app)
      .get('/api/posters')
      .set('Authorization', `Bearer ${tokenA}`);

    console.log('Status Code:', res2.status);
    console.log('Total Posters Count:', res2.body.pagination?.total);
    console.log('Headlines:', res2.body.data.map((p: any) => p.headline));

    if (
      res2.status !== 200 ||
      res2.body.success !== true ||
      res2.body.pagination.total !== 3 ||
      res2.body.data.length !== 3
    ) {
      throw new Error('User A did not get exactly 3 posters!');
    }

    // Verify User B's poster is NOT returned to User A
    const hasPosterB = res2.body.data.some((p: any) => p._id === posterB1._id.toString());
    if (hasPosterB) {
      throw new Error('User B poster was leaked to User A!');
    }
    console.log('✓ User Isolation check passed (User B poster not returned to User A).');

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

    // TEST 4: Pagination (Limit=2, Page=1 and Page=2)
    console.log('\n--- 4. Testing Pagination (limit=2) ---');
    const resPage1 = await request(app)
      .get('/api/posters?page=1&limit=2')
      .set('Authorization', `Bearer ${tokenA}`);

    console.log('Page 1 items count:', resPage1.body.data.length);
    console.log('Page 1 pagination:', resPage1.body.pagination);

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

    console.log('Page 2 items count:', resPage2.body.data.length);
    console.log('Page 2 item headline:', resPage2.body.data[0]?.headline);

    if (resPage2.body.data.length !== 1 || resPage2.body.data[0].headline !== 'পোস্টার ১ - পুরোনো') {
      throw new Error('Page 2 pagination data incorrect!');
    }
    console.log('✓ Pagination check passed.');

    // TEST 5: Invalid Pagination Values -> 400 Bad Request
    console.log('\n--- 5. Testing Invalid Pagination Values (limit=100, page=0, page=abc) ---');
    
    const resInv1 = await request(app)
      .get('/api/posters?limit=100')
      .set('Authorization', `Bearer ${tokenA}`);
    console.log('limit=100 Status:', resInv1.status);
    if (resInv1.status !== 400) {
      throw new Error('limit=100 (exceeding max 50) was not rejected with 400!');
    }

    const resInv2 = await request(app)
      .get('/api/posters?page=0')
      .set('Authorization', `Bearer ${tokenA}`);
    console.log('page=0 Status:', resInv2.status);
    if (resInv2.status !== 400) {
      throw new Error('page=0 was not rejected with 400!');
    }

    const resInv3 = await request(app)
      .get('/api/posters?page=invalid')
      .set('Authorization', `Bearer ${tokenA}`);
    console.log('page=invalid Status:', resInv3.status);
    if (resInv3.status !== 400) {
      throw new Error('page=invalid was not rejected with 400!');
    }

    console.log('✓ 400 Bad Request check for invalid pagination passed.');

    // TEST 6: User B gets ONLY User B's posters (1 total)
    console.log('\n--- 6. Testing User B Isolation ---');
    const resUserB = await request(app)
      .get('/api/posters')
      .set('Authorization', `Bearer ${tokenB}`);

    console.log('User B total posters:', resUserB.body.pagination.total);
    if (resUserB.body.pagination.total !== 1 || resUserB.body.data[0]._id !== posterB1._id.toString()) {
      throw new Error('User B isolation check failed!');
    }
    console.log('✓ User B Isolation check passed.');

    console.log('\nAll Poster History API endpoint tests passed successfully!');
  } catch (error: any) {
    console.error('History API Test failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
}

runPosterHistoryApiTest();
