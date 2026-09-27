import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { User } from '../models/user.model.js';
import { Template } from '../models/template.model.js';
import { Poster } from '../models/poster.model.js';
import { generateToken } from '../utils/jwt.js';
import cloudinary from '../services/cloudinary.service.js';

async function runPosterRegenerateApiTest() {
  console.log('=== TEST: Poster Regeneration API Endpoint (POST /api/posters/:id/regenerate) ===');

  let mongoServer: MongoMemoryServer | null = null;

  try {
    // 1. Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✓ In-memory MongoDB connected successfully.');

    // 2. Create User A and User B
    const userA = await User.create({
      name: 'User A',
      email: 'usera@test.com',
      passwordHash: 'hash_a',
      role: 'user',
    });

    const userB = await User.create({
      name: 'User B',
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

    // 3. Create Active Template and Inactive Template
    const activeTemplate = await Template.create({
      name: 'Victory Day Poster',
      occasion: 'victory-day',
      previewUrl: 'https://placehold.co/600x800.png',
      layoutConfig: { canvas: { width: 1080, height: 1350 } },
      isActive: true,
    });

    const inactiveTemplate = await Template.create({
      name: 'Archived Disabled Poster Template',
      occasion: 'archived-event',
      previewUrl: 'https://placehold.co/600x800.png',
      layoutConfig: { canvas: { width: 1080, height: 1350 } },
      isActive: false,
    });

    // 4. Create initial Poster for User A (active template)
    const originalPosterA = await Poster.create({
      userId: userA._id,
      templateId: activeTemplate._id,
      occasion: 'বিজয় দিবস',
      headline: 'মূল পোস্টার হেডলাইন',
      name: 'ইউজার এ',
      designation: 'সাধারণ সম্পাদক',
      party: 'ছাত্র ফ্রন্ট',
      location: 'ঢাকা',
      originalImageUrl: 'https://cloudinary.com/original.jpg',
      generatedImageUrl: 'https://cloudinary.com/gen_v1.png',
      generatedImagePublicId: 'gen_v1_id',
      layout: {
        backgroundColor: '#004D40',
        accentColor: '#FFD700',
        photoPlacement: 'center-circle',
        headlinePlacement: 'below-photo',
        decorativeStyle: 'patriotic-flag',
      },
    });

    // Create a Poster for User A linked to inactive template
    const posterWithInactiveTemplate = await Poster.create({
      userId: userA._id,
      templateId: inactiveTemplate._id,
      occasion: 'পুরাতন অনুষ্ঠান',
      headline: 'নিষ্ক্রিয় টেমপ্লেট পোস্টার',
      name: 'ইউজার এ',
      designation: 'সদস্য',
      party: 'দল এ',
      location: 'ঢাকা',
      generatedImageUrl: 'https://cloudinary.com/inactive_v1.png',
      generatedImagePublicId: 'inactive_v1_id',
      layout: {
        backgroundColor: '#004D40',
        accentColor: '#FFD700',
        photoPlacement: 'center-circle',
        headlinePlacement: 'below-photo',
        decorativeStyle: 'patriotic-flag',
      },
    });

    console.log('✓ Seed Posters created for User A. Active Poster ID:', originalPosterA._id.toString());

    // 5. Stub Cloudinary upload_stream to return mock response for regenerated image
    const mockRegenUrl = 'https://res.cloudinary.com/test/image/upload/v999/regen_poster.png';
    const mockRegenPublicId = 'ai-political-posters/generated/regen_poster_999';

    cloudinary.uploader.upload_stream = ((options: any, callback: any) => {
      setTimeout(() => {
        if (callback) {
          callback(null, {
            secure_url: mockRegenUrl,
            public_id: mockRegenPublicId,
          });
        }
      }, 10);

      return {
        end: (buffer: Buffer) => {
          console.log(`✓ Cloudinary upload_stream called for regeneration! Buffer size: ${buffer.length} bytes`);
        },
      } as any;
    }) as any;

    // TEST 1: Unauthenticated request should return 401
    console.log('\n--- 1. Testing Unauthenticated Request ---');
    const res1 = await request(app).post(`/api/posters/${originalPosterA._id}/regenerate`);
    console.log('Status Code:', res1.status);
    if (res1.status !== 401 || res1.body.success !== false) {
      throw new Error('Unauthenticated request was not rejected with 401!');
    }
    console.log('✓ 401 Unauthorized check passed.');

    // TEST 2: Malformed poster ID format should return 400
    console.log('\n--- 2. Testing Malformed Poster ID Format ("invalid-id") ---');
    const res2 = await request(app)
      .post('/api/posters/invalid-poster-id-format/regenerate')
      .set('Authorization', `Bearer ${tokenA}`);
    console.log('Status Code:', res2.status);
    if (res2.status !== 400 || res2.body.success !== false) {
      throw new Error('Invalid poster ID format was not rejected with 400!');
    }
    console.log('✓ 400 Bad Request check passed.');

    // TEST 3: Valid ObjectId that does not correspond to any poster -> 404 Not Found
    console.log('\n--- 3. Testing Valid Non-Existent Poster ObjectId ---');
    const nonExistentPosterId = new mongoose.Types.ObjectId().toString();
    const resNonExistent = await request(app)
      .post(`/api/posters/${nonExistentPosterId}/regenerate`)
      .set('Authorization', `Bearer ${tokenA}`);
    console.log('Non-existent Poster ID Status Code:', resNonExistent.status, 'Message:', resNonExistent.body.message);
    if (resNonExistent.status !== 404 || resNonExistent.body.success !== false) {
      throw new Error('Non-existent poster ObjectId request was not rejected with 404!');
    }
    console.log('✓ 404 Not Found check passed for non-existent poster ObjectId.');

    // TEST 4: Another user's poster (User B regenerating User A's poster) -> 404 Not Found (Security check)
    console.log('\n--- 4. Testing Ownership Security (User B regenerating User A poster) ---');
    const res3 = await request(app)
      .post(`/api/posters/${originalPosterA._id}/regenerate`)
      .set('Authorization', `Bearer ${tokenB}`);
    console.log('Status Code:', res3.status);
    console.log('Message:', res3.body.message);
    if (res3.status !== 404 || res3.body.success !== false) {
      throw new Error('User B was able to access or regenerate User A poster!');
    }
    console.log('✓ 404 Not Found ownership isolation check passed.');

    // TEST 5: Source poster references an inactive template -> 404 Not Found & no poster created
    console.log('\n--- 5. Testing Inactive Template Source Poster Regeneration ---');
    const totalPostersBeforeInactiveRegen = await Poster.countDocuments();

    const resInactive = await request(app)
      .post(`/api/posters/${posterWithInactiveTemplate._id}/regenerate`)
      .set('Authorization', `Bearer ${tokenA}`);

    console.log('Inactive Template Regeneration Status Code:', resInactive.status, 'Message:', resInactive.body.message);
    const totalPostersAfterInactiveRegen = await Poster.countDocuments();

    if (resInactive.status !== 404 || resInactive.body.success !== false) {
      throw new Error('Regeneration for poster with inactive template was not rejected with 404!');
    }
    if (totalPostersAfterInactiveRegen !== totalPostersBeforeInactiveRegen) {
      throw new Error('A new poster was erroneously created when regenerating against an inactive template!');
    }
    console.log('✓ 404 Not Found check passed for poster referencing an inactive template (no poster created).');

    // TEST 6: Owner successfully regenerating their own poster -> HTTP 201
    console.log('\n--- 6. Testing Successful Regeneration by Owner (User A) ---');
    const startTime = Date.now();
    const res4 = await request(app)
      .post(`/api/posters/${originalPosterA._id}/regenerate`)
      .set('Authorization', `Bearer ${tokenA}`);

    console.log(`Executed in ${Date.now() - startTime}ms`);
    console.log('Status Code:', res4.status);
    console.log('Response Data:', JSON.stringify(res4.body, null, 2));

    if (
      res4.status !== 201 ||
      res4.body.success !== true ||
      res4.body.message !== 'Poster regenerated successfully' ||
      !res4.body.data.posterId ||
      res4.body.data.posterId === originalPosterA._id.toString() || // Must be NEW ID!
      res4.body.data.generatedImageUrl !== mockRegenUrl
    ) {
      throw new Error('Regeneration response did not return expected NEW 201 structure!');
    }
    console.log('✓ 201 Created valid response check passed.');

    // TEST 7: Confirm NEW poster document created & original poster unchanged
    console.log('\n--- 7. Verifying Database Integrity & Document Creation ---');
    const userAPostersCount = await Poster.countDocuments({ userId: userA._id });
    console.log('User A Total Posters in DB:', userAPostersCount);

    // User A originally had 2 posters (originalPosterA + posterWithInactiveTemplate). After 1 successful regen, count must be 3.
    if (userAPostersCount !== 3) {
      throw new Error(`Expected User A to have 3 poster documents in DB, found ${userAPostersCount}`);
    }

    const fetchedOriginal = await Poster.findById(originalPosterA._id);
    if (
      !fetchedOriginal ||
      fetchedOriginal.generatedImageUrl !== 'https://cloudinary.com/gen_v1.png' ||
      !fetchedOriginal.headline
    ) {
      throw new Error(`Original poster was modified! URL: "${fetchedOriginal?.generatedImageUrl}", headline: "${fetchedOriginal?.headline}"`);
    }

    console.log('✓ Original Poster document remains completely unchanged in MongoDB.');

    const newRegeneratedPoster = await Poster.findById(res4.body.data.posterId);
    if (!newRegeneratedPoster) {
      throw new Error('New regenerated Poster document was not found in MongoDB!');
    }

    console.log('✓ NEW Poster document verified in DB. ID:', newRegeneratedPoster._id.toString());
    console.log('✓ NEW Poster owner in DB:', newRegeneratedPoster.userId.toString(), 'Matches User A:', userA._id.toString());

    if (newRegeneratedPoster.userId.toString() !== userA._id.toString()) {
      throw new Error('Regenerated poster owner does not match authenticated user!');
    }

    if (!Array.isArray(newRegeneratedPoster.originalImageUrls) || newRegeneratedPoster.originalImageUrls.length !== 1 || newRegeneratedPoster.originalImageUrls[0] !== 'https://cloudinary.com/original.jpg') {
      throw new Error(`Expected regenerated poster originalImageUrls to contain ['https://cloudinary.com/original.jpg'], got ${JSON.stringify(newRegeneratedPoster.originalImageUrls)}`);
    }

    if (newRegeneratedPoster.originalImageUrl !== 'https://cloudinary.com/original.jpg') {
      throw new Error(`Expected regenerated poster originalImageUrl to be 'https://cloudinary.com/original.jpg', got ${newRegeneratedPoster.originalImageUrl}`);
    }
    console.log('✓ Backward compatibility check passed: Legacy poster with originalImageUrl regenerated successfully preserving image URLs.');

    console.log('\nAll Poster Regeneration API endpoint tests passed successfully!');
  } catch (error: any) {
    console.error('Regeneration API Test failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    process.exit(process.exitCode || 0);
  }
}

runPosterRegenerateApiTest();
