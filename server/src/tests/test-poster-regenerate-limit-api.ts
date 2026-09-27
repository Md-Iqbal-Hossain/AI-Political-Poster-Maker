import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { User } from '../models/user.model.js';
import { Template } from '../models/template.model.js';
import { Poster } from '../models/poster.model.js';
import { generateToken } from '../utils/jwt.js';
import cloudinary from '../services/cloudinary.service.js';
import { resetPosterRateLimitStore } from '../middlewares/rate-limit.middleware.js';

async function runPosterRegenerateLimitTest() {
  console.log('=== TEST: Poster Regeneration Limit Validation (Max 3 Regenerations Per Poster) ===');

  let mongoServer: MongoMemoryServer | null = null;

  try {
    resetPosterRateLimitStore();

    // 1. Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✓ In-memory MongoDB connected successfully.');

    // 2. Seed test users & template
    const userA = await User.create({
      name: 'Regen Owner User',
      email: 'regen_owner@test.com',
      passwordHash: 'hash_a',
      role: 'user',
    });

    const userB = await User.create({
      name: 'Regen Intruder User',
      email: 'regen_intruder@test.com',
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

    const activeTemplate = await Template.create({
      name: 'Regen Test Template',
      occasion: 'test-event',
      previewUrl: 'https://placehold.co/600x800.png',
      layoutConfig: { canvas: { width: 1080, height: 1350 } },
      isActive: true,
    });

    // 3. Stub Cloudinary upload_stream
    let uploadCount = 0;
    cloudinary.uploader.upload_stream = ((options: any, callback: any) => {
      uploadCount++;
      setTimeout(() => {
        if (callback) {
          callback(null, {
            secure_url: `https://res.cloudinary.com/test/image/upload/v${uploadCount}/regen_poster_${uploadCount}.png`,
            public_id: `ai-political-posters/generated/regen_poster_${uploadCount}`,
          });
        }
      }, 5);

      return {
        end: (buffer: Buffer) => {},
      } as any;
    }) as any;

    // Seed initial original poster for User A
    const originalPoster = await Poster.create({
      userId: userA._id,
      templateId: activeTemplate._id,
      occasion: 'বিজয় দিবস',
      headline: 'পুনরুউৎপাদন সীমাবদ্ধতা টেস্ট শিরোনাম',
      name: 'ইউজার এ',
      designation: 'সভাপতি',
      party: 'ছাত্র ফ্রন্ট',
      location: 'ঢাকা',
      originalImageUrl: 'https://cloudinary.com/original.jpg',
      originalImageUrls: ['https://cloudinary.com/original.jpg'],
      generatedImageUrl: 'https://cloudinary.com/original_gen.png',
      generatedImagePublicId: 'original_gen_id',
      layout: {
        backgroundColor: '#004D40',
        accentColor: '#FFD700',
        photoPlacement: 'center-circle',
        headlinePlacement: 'below-photo',
        decorativeStyle: 'patriotic-flag',
      },
      regenerationCount: 0,
    });

    console.log('✓ Seed Poster created for User A. Original Poster ID:', originalPoster._id.toString());

    // TEST 1: Unauthenticated regeneration request should return 401
    console.log('\n--- 1. Testing Unauthenticated Regeneration Request ---');
    const resUnauth = await request(app).post(`/api/posters/${originalPoster._id}/regenerate`);
    console.log('Status Code:', resUnauth.status, 'Message:', resUnauth.body.message);
    if (resUnauth.status !== 401 || resUnauth.body.success !== false) {
      throw new Error('Unauthenticated regeneration request was not rejected with HTTP 401!');
    }
    console.log('✓ 401 Unauthorized check passed.');

    // TEST 2: Cross-user regeneration request (User B attempting to regenerate User A poster) -> HTTP 404
    console.log('\n--- 2. Testing Ownership Security (User B regenerating User A poster) ---');
    const resCrossUser = await request(app)
      .post(`/api/posters/${originalPoster._id}/regenerate`)
      .set('Authorization', `Bearer ${tokenB}`);

    console.log('Status Code:', resCrossUser.status, 'Message:', resCrossUser.body.message);
    if (resCrossUser.status !== 404 || resCrossUser.body.success !== false) {
      throw new Error('User B was able to access or regenerate User A poster!');
    }
    console.log('✓ 404 Not Found ownership isolation check passed.');

    // TEST 3: 3 Allowed Regenerations for the same original poster
    console.log('\n--- 3. Testing 3 Allowed Consecutive Regenerations for Owner (User A) ---');
    const createdRegenIds: string[] = [];

    for (let attempt = 1; attempt <= 3; attempt++) {
      const resRegen = await request(app)
        .post(`/api/posters/${originalPoster._id}/regenerate`)
        .set('Authorization', `Bearer ${tokenA}`);

      console.log(`Regeneration #${attempt} Status Code:`, resRegen.status, 'New Poster ID:', resRegen.body.data?.posterId);
      if (resRegen.status !== 201 || !resRegen.body.success || !resRegen.body.data?.posterId) {
        throw new Error(`Regeneration attempt #${attempt} failed unexpectedly with status ${resRegen.status}`);
      }
      createdRegenIds.push(resRegen.body.data.posterId);

      // Verify original poster document in DB has updated regenerationCount
      const fetchedOriginal = await Poster.findById(originalPoster._id);
      if (fetchedOriginal?.regenerationCount !== attempt) {
        throw new Error(`Original poster regenerationCount in DB expected ${attempt}, found ${fetchedOriginal?.regenerationCount}`);
      }
    }
    console.log('✓ 3 consecutive regenerations succeeded with HTTP 201. Original poster DB regenerationCount = 3.');

    // TEST 4: 4th Regeneration Attempt on Original Poster -> Blocked with HTTP 429
    console.log('\n--- 4. Testing 4th Regeneration Attempt on Original Poster (Limit Exceeded) ---');
    const res4th = await request(app)
      .post(`/api/posters/${originalPoster._id}/regenerate`)
      .set('Authorization', `Bearer ${tokenA}`);

    console.log('4th Regeneration Attempt Status Code:', res4th.status);
    console.log('4th Regeneration Attempt Body:', res4th.body);

    if (res4th.status !== 429 || res4th.body.success !== false) {
      throw new Error('4th regeneration attempt on original poster was not blocked with HTTP 429!');
    }
    if (!res4th.body.message?.includes('Maximum 3 regenerations allowed')) {
      throw new Error(`429 error message did not contain expected limit text. Got: "${res4th.body.message}"`);
    }
    console.log('✓ 4th regeneration attempt on original poster successfully blocked with HTTP 429.');

    // TEST 5: Regeneration Attempt on a Regenerated Child Poster (Inherited Count >= 3) -> Blocked with HTTP 429
    console.log('\n--- 5. Testing Regeneration Attempt on Child Poster Inheriting Limit ---');
    const lastChildPosterId = createdRegenIds[createdRegenIds.length - 1];
    const resChildRegen = await request(app)
      .post(`/api/posters/${lastChildPosterId}/regenerate`)
      .set('Authorization', `Bearer ${tokenA}`);

    console.log('Child Poster Regeneration Attempt Status Code:', resChildRegen.status, 'Message:', resChildRegen.body.message);
    if (resChildRegen.status !== 429 || resChildRegen.body.success !== false) {
      throw new Error('Regeneration attempt on child poster inheriting count >= 3 was not blocked with HTTP 429!');
    }
    console.log('✓ Regeneration attempt on child poster inheriting limit successfully blocked with HTTP 429.');

    // TEST 6: Normal Poster Generation (`POST /api/posters/generate`) remains unaffected
    console.log('\n--- 6. Testing Normal Poster Generation Unaffected ---');
    const resNormalGen = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        templateId: activeTemplate._id.toString(),
        occasion: 'বিজয় দিবস',
        headline: 'স্বাভাবিক পোস্টার তৈরি',
        name: 'ইউজার এ',
        designation: 'সভাপতি',
        party: 'ছাত্র ফ্রন্ট',
        location: 'ঢাকা',
      });

    console.log('Normal Generation Status Code:', resNormalGen.status, 'Poster ID:', resNormalGen.body.data?.posterId);
    if (resNormalGen.status !== 201 || !resNormalGen.body.success) {
      throw new Error('Normal poster generation was wrongly affected by regeneration limit!');
    }
    console.log('✓ Normal poster generation functions normally and returns HTTP 201.');

    console.log('\nAll Poster Regeneration Limit tests passed successfully!');
  } catch (error: any) {
    console.error('Regeneration Limit Test failed:', error?.message || error);
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

runPosterRegenerateLimitTest();
