import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { User } from '../models/user.model.js';
import { Template } from '../models/template.model.js';
import { generateToken } from '../utils/jwt.js';
import cloudinary from '../services/cloudinary.service.js';

async function runPosterApiTest() {
  console.log('=== TEST: Poster Generation API Endpoint (POST /api/posters/generate) ===');

  let mongoServer: MongoMemoryServer | null = null;

  try {
    // 1. Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✓ In-memory MongoDB connected successfully.');

    // 2. Create seed User and Template
    const testUser = await User.create({
      name: 'API Candidate',
      email: 'candidate_api@test.com',
      passwordHash: 'hashed_password_123',
      role: 'user',
    });

    const testTemplate = await Template.create({
      name: 'Victory Day Patriotic Poster',
      occasion: 'victory-day',
      description: 'Victory Day celebration template',
      previewUrl: 'https://placehold.co/600x800.png',
      layoutConfig: {
        canvas: { width: 1080, height: 1350, orientation: 'portrait' },
        headlinePlacement: { color: '#006A4E' },
        footerPlacement: { backgroundColor: '#004D40' },
      },
      isActive: true,
    });

    // 3. Stub Cloudinary uploader.upload_stream to avoid live network uploads during API test
    const mockSecureUrl = 'https://res.cloudinary.com/test/image/upload/v12345/ai-political-posters/generated/api_test_poster.png';
    const mockPublicId = 'ai-political-posters/generated/api_test_poster_123';

    cloudinary.uploader.upload_stream = ((options: any, callback: any) => {
      setTimeout(() => {
        if (callback) {
          callback(null, {
            secure_url: mockSecureUrl,
            public_id: mockPublicId,
          });
        }
      }, 10);

      return {
        end: (buffer: Buffer) => {
          console.log(`✓ Cloudinary upload_stream called from API! Received PNG Buffer (${buffer.length} bytes)`);
        },
      } as any;
    }) as any;

    const validToken = generateToken({
      userId: testUser._id.toString(),
      email: testUser.email,
      role: testUser.role,
    });

    const validPayload = {
      templateId: testTemplate._id.toString(),
      occasion: 'বিজয় দিবস',
      headline: 'সবাইকে মহান বিজয় দিবসের শুভেচ্ছা ও অভিনন্দন',
      name: 'মোঃ জহিরুল ইসলাম',
      designation: 'সাধারণ সম্পাদক, বাংলাদেশ ছাত্র ফ্রন্ট',
      party: 'বাংলাদেশ ছাত্র ফ্রন্ট',
      location: 'ঢাকা উত্তর শাখা',
      photoUrl: 'https://placehold.co/400x400/006a4e/ffffff.png?text=Leader',
    };

    // TEST 1: Unauthenticated request should return 401
    console.log('\n--- 1. Testing Unauthenticated Request ---');
    const res1 = await request(app)
      .post('/api/posters/generate')
      .send(validPayload);

    console.log('Status Code:', res1.status);
    console.log('Response Body:', res1.body);
    if (res1.status !== 401 || res1.body.success !== false) {
      throw new Error('Unauthenticated request was not rejected with 401!');
    }
    console.log('✓ 401 Unauthorized check passed.');

    // TEST 2: Invalid Request Body should return 400
    console.log('\n--- 2. Testing Invalid Request Body (Missing headline) ---');
    const invalidPayload = { ...validPayload, headline: '' };
    const res2 = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${validToken}`)
      .send(invalidPayload);

    console.log('Status Code:', res2.status);
    console.log('Response Errors:', res2.body.errors);
    if (res2.status !== 400 || res2.body.success !== false) {
      throw new Error('Invalid body request was not rejected with 400!');
    }
    console.log('✓ 400 Bad Request check passed.');

    // TEST 3: Authenticated Valid Request should return 201
    console.log('\n--- 3. Testing Authenticated Valid Request ---');
    const startTime = Date.now();
    const res3 = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${validToken}`)
      .send(validPayload);

    console.log(`Executed in ${Date.now() - startTime}ms`);
    console.log('Status Code:', res3.status);
    console.log('Response Body:', JSON.stringify(res3.body, null, 2));

    if (
      res3.status !== 201 ||
      res3.body.success !== true ||
      res3.body.message !== 'Poster generated successfully' ||
      !res3.body.data.posterId ||
      res3.body.data.generatedImageUrl !== mockSecureUrl ||
      res3.body.data.generatedImagePublicId !== mockPublicId ||
      res3.body.data.templateId !== testTemplate._id.toString() ||
      !res3.body.data.layout
    ) {
      throw new Error('Valid generation request did not return expected 201 structure!');
    }
    console.log('✓ 201 Created valid response check passed.');

    // TEST 4: Template Not Found Error should return 404
    console.log('\n--- 4. Testing Template Not Found Error ---');
    const nonExistentTemplateId = new mongoose.Types.ObjectId().toString();
    const notFoundPayload = { ...validPayload, templateId: nonExistentTemplateId };
    const res4 = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${validToken}`)
      .send(notFoundPayload);

    console.log('Status Code:', res4.status);
    console.log('Response Message:', res4.body.message);
    if (res4.status !== 404 || res4.body.success !== false) {
      throw new Error('Non-existent template request did not return 404!');
    }
    console.log('✓ 404 Template Not Found check passed.');

    console.log('\nAll Poster API endpoint tests passed successfully!');
  } catch (error: any) {
    console.error('API Test failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
}

runPosterApiTest();
