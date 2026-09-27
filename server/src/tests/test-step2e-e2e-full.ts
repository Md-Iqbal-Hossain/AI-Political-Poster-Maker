import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import app from '../app.js';
import { User } from '../models/user.model.js';
import { Template } from '../models/template.model.js';
import { Poster } from '../models/poster.model.js';
import { generateToken } from '../utils/jwt.js';
import cloudinary from '../services/cloudinary.service.js';
import { generatePosterHtml } from '../services/poster-render.service.js';

// Helper to inspect PNG dimensions from header
function getPngDimensions(buffer: Buffer): { width: number; height: number } {
  if (buffer.length < 24 || buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
    throw new Error('Not a valid PNG buffer');
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

async function runStep2EFullVerification() {
  console.log('================================================================');
  console.log('=== PHASE 7.5 — STEP 2E: FULL MULTI-PHOTO END-TO-END VERIFICATION ===');
  console.log('================================================================\n');

  let mongoServer: MongoMemoryServer | null = null;

  try {
    // -------------------------------------------------------------
    // SETUP: DB & Mock Cloudinary
    // -------------------------------------------------------------
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✓ In-memory MongoDB connected successfully.');

    // Seed test users
    const userAlpha = await User.create({
      name: 'User Alpha',
      email: 'alpha@test.com',
      passwordHash: 'hash_alpha',
      role: 'user',
    });

    const userBeta = await User.create({
      name: 'User Beta',
      email: 'beta@test.com',
      passwordHash: 'hash_beta',
      role: 'user',
    });

    const tokenAlpha = generateToken({
      userId: userAlpha._id.toString(),
      email: userAlpha.email,
      role: userAlpha.role,
    });

    const tokenBeta = generateToken({
      userId: userBeta._id.toString(),
      email: userBeta.email,
      role: userBeta.role,
    });

    // Seed active template
    const template = await Template.create({
      name: 'National Victory Poster',
      occasion: 'victory-day',
      previewUrl: 'https://placehold.co/600x800.png',
      layoutConfig: { canvas: { width: 1200, height: 1600 } },
      isActive: true,
    });

    // Mock Cloudinary upload_stream for image uploads & poster generation uploads
    let uploadCounter = 0;
    cloudinary.uploader.upload_stream = ((options: any, callback: any) => {
      uploadCounter++;
      const isPosterGen = options?.folder?.includes('generated');
      const mockUrl = isPosterGen
        ? `https://res.cloudinary.com/test/image/upload/v100${uploadCounter}/ai-political-posters/generated/poster_${uploadCounter}.png`
        : `https://res.cloudinary.com/test/image/upload/v100${uploadCounter}/ai-political-posters/uploads/leader_${uploadCounter}.jpg`;
      const mockPublicId = isPosterGen
        ? `ai-political-posters/generated/poster_${uploadCounter}`
        : `ai-political-posters/uploads/leader_${uploadCounter}`;

      setTimeout(() => {
        if (callback) {
          callback(null, {
            secure_url: mockUrl,
            public_id: mockPublicId,
          });
        }
      }, 10);

      return {
        end: (buffer: Buffer) => {},
      } as any;
    }) as any;

    console.log('✓ Database & Seed Environment initialized.\n');

    // Create synthetic test PNG buffers for multi-photo uploads
    const createTestImageBuffer = (label: string): Buffer => {
      // 100x100 minimal valid PNG representation
      return Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
    };

    const dummyImg1 = createTestImageBuffer('Photo 1');
    const dummyImg2 = createTestImageBuffer('Photo 2');
    const dummyImg3 = createTestImageBuffer('Photo 3');
    const dummyImg4 = createTestImageBuffer('Photo 4');

    // -------------------------------------------------------------
    // SECTION 1: UPLOAD API & MULTI-PHOTO GENERATION CASES (0, 1, 2, 3, 4 photos)
    // -------------------------------------------------------------
    console.log('--- SECTION 1: Upload API & Poster Generation (0, 1, 2, 3, 4 photos) ---');

    // 1A. CASE 0 PHOTOS
    console.log('\n[Case 0 Photos] Requesting poster generation with 0 photos...');
    const res0 = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .send({
        templateId: template._id.toString(),
        occasion: 'বিজয় দিবস',
        headline: 'সবাইকে বিজয় দিবসের শুভেচ্ছা',
        name: 'লিডার জহির',
        designation: 'সভাপতি',
        party: 'বাংলাদেশ ছাত্র সমিতি',
        location: 'ঢাকা branch',
        photoUrls: [],
      });

    console.log('Case 0 Status:', res0.status, 'Poster ID:', res0.body.data?.posterId);
    if (res0.status !== 201 || !res0.body.success) {
      throw new Error('Case 0 photo poster generation failed');
    }
    const posterDoc0 = await Poster.findById(res0.body.data.posterId);
    if (!posterDoc0) throw new Error('Case 0 poster document not found in DB');
    if ((posterDoc0.originalImageUrls?.length || 0) !== 0 || posterDoc0.originalImageUrl !== undefined) {
      throw new Error('Case 0 DB originalImageUrls check failed');
    }
    const html0 = generatePosterHtml({
      headline: posterDoc0.headline,
      photoUrls: posterDoc0.originalImageUrls || [],
      photoUrl: posterDoc0.originalImageUrl,
    });
    if (!html0.includes('placeholder-avatar')) {
      throw new Error('Case 0 poster HTML missing placeholder avatar!');
    }
    console.log('✓ Case 0 photos verified: HTML contains placeholder avatar, DB records 0 photos.');

    // 1B. CASE 1 PHOTO
    console.log('\n[Case 1 Photo] Uploading 1 image...');
    const uploadRes1 = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .attach('images', dummyImg1, 'leader1.jpg');

    console.log('Upload 1 Status:', uploadRes1.status, 'Uploaded URLs count:', uploadRes1.body.images?.length);
    if (uploadRes1.status !== 200 || uploadRes1.body.images.length !== 1) {
      throw new Error('Case 1 image upload failed');
    }
    const url1 = uploadRes1.body.images[0].secureUrl;

    const res1 = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .send({
        templateId: template._id.toString(),
        occasion: 'বিজয় দিবস',
        headline: 'এক একক ছবি পোস্টার',
        name: 'লিডার জহির',
        designation: 'সভাপতি',
        party: 'বাংলাদেশ ছাত্র সমিতি',
        location: 'ঢাকা branch',
        photoUrls: [url1],
      });

    console.log('Case 1 Status:', res1.status, 'Poster ID:', res1.body.data?.posterId);
    if (res1.status !== 201 || !res1.body.success) throw new Error('Case 1 generation failed');
    const posterDoc1 = await Poster.findById(res1.body.data.posterId);
    if (!posterDoc1) throw new Error('Case 1 poster document not found');
    if ((posterDoc1.originalImageUrls?.length || 0) !== 1 || posterDoc1.originalImageUrls?.[0] !== url1) {
      throw new Error('Case 1 DB originalImageUrls array mismatch!');
    }
    if (posterDoc1.originalImageUrl !== url1) {
      throw new Error('Case 1 DB originalImageUrl backward compatibility check failed!');
    }
    const html1 = generatePosterHtml({
      headline: posterDoc1.headline,
      photoUrls: posterDoc1.originalImageUrls,
    });
    if (!html1.includes('single-photo') || !html1.includes(url1)) {
      throw new Error('Case 1 HTML frame rendering check failed');
    }
    console.log('✓ Case 1 photo verified: Cloudinary URL received, MongoDB stores 1 URL, HTML renders 1 frame, originalImageUrl = first URL.');

    // 1C. CASE 2 PHOTOS
    console.log('\n[Case 2 Photos] Uploading 2 images...');
    const uploadRes2 = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .attach('images', dummyImg1, 'leader1.jpg')
      .attach('images', dummyImg2, 'leader2.jpg');

    console.log('Upload 2 Status:', uploadRes2.status, 'Uploaded URLs count:', uploadRes2.body.images?.length);
    if (uploadRes2.status !== 200 || uploadRes2.body.images.length !== 2) {
      throw new Error('Case 2 image upload failed');
    }
    const urls2 = uploadRes2.body.images.map((i: any) => i.secureUrl);

    const res2 = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .send({
        templateId: template._id.toString(),
        occasion: 'বিজয় দিবস',
        headline: 'দুই ছবির যৌথ পোস্টার',
        name: 'লিডার জহির ও সম্পাদক',
        designation: 'সভাপতি ও সম্পাদক',
        party: 'বাংলাদেশ ছাত্র সমিতি',
        location: 'ঢাকা branch',
        photoUrls: urls2,
      });

    console.log('Case 2 Status:', res2.status, 'Poster ID:', res2.body.data?.posterId);
    if (res2.status !== 201 || !res2.body.success) throw new Error('Case 2 generation failed');
    const posterDoc2 = await Poster.findById(res2.body.data.posterId);
    if (!posterDoc2) throw new Error('Case 2 poster document not found');
    if ((posterDoc2.originalImageUrls?.length || 0) !== 2) {
      throw new Error('Case 2 DB originalImageUrls length mismatch');
    }
    if (posterDoc2.originalImageUrl !== urls2[0]) {
      throw new Error('Case 2 DB originalImageUrl backward compatibility check failed!');
    }
    const html2 = generatePosterHtml({
      headline: posterDoc2.headline,
      photoUrls: posterDoc2.originalImageUrls,
    });
    if (!html2.includes('two-photos') || !html2.includes(urls2[0]) || !html2.includes(urls2[1])) {
      throw new Error('Case 2 HTML frame rendering check failed');
    }
    console.log('✓ Case 2 photos verified: Cloudinary URLs received, MongoDB stores 2 URLs, HTML renders 2 side-by-side frames, originalImageUrl = first URL.');

    // 1D. CASE 3 PHOTOS
    console.log('\n[Case 3 Photos] Uploading 3 images...');
    const uploadRes3 = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .attach('images', dummyImg1, 'leader1.jpg')
      .attach('images', dummyImg2, 'leader2.jpg')
      .attach('images', dummyImg3, 'leader3.jpg');

    console.log('Upload 3 Status:', uploadRes3.status, 'Uploaded URLs count:', uploadRes3.body.images?.length);
    if (uploadRes3.status !== 200 || uploadRes3.body.images.length !== 3) {
      throw new Error('Case 3 image upload failed');
    }
    const urls3 = uploadRes3.body.images.map((i: any) => i.secureUrl);

    const res3 = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .send({
        templateId: template._id.toString(),
        occasion: 'বিজয় দিবস',
        headline: 'তিন ছবির ত্রয়ী পোস্টার',
        name: 'তিন নেতা',
        designation: 'কেন্দ্রীয় নেতৃত্ব',
        party: 'বাংলাদেশ ছাত্র সমিতি',
        location: 'ঢাকা branch',
        photoUrls: urls3,
      });

    console.log('Case 3 Status:', res3.status, 'Poster ID:', res3.body.data?.posterId);
    if (res3.status !== 201 || !res3.body.success) throw new Error('Case 3 generation failed');
    const posterDoc3 = await Poster.findById(res3.body.data.posterId);
    if (!posterDoc3) throw new Error('Case 3 poster document not found');
    if ((posterDoc3.originalImageUrls?.length || 0) !== 3) {
      throw new Error('Case 3 DB originalImageUrls length mismatch');
    }
    if (posterDoc3.originalImageUrl !== urls3[0]) {
      throw new Error('Case 3 DB originalImageUrl backward compatibility check failed!');
    }
    const html3 = generatePosterHtml({
      headline: posterDoc3.headline,
      photoUrls: posterDoc3.originalImageUrls,
    });
    if (
      !html3.includes('three-photos') ||
      !html3.includes(urls3[0]) ||
      !html3.includes(urls3[1]) ||
      !html3.includes(urls3[2])
    ) {
      throw new Error('Case 3 HTML frame rendering check failed');
    }
    console.log('✓ Case 3 photos verified: Cloudinary URLs received, MongoDB stores 3 URLs, HTML renders 3 side-by-side frames, originalImageUrl = first URL.');

    // 1E. CASE 4 PHOTOS (REJECTION CHECK)
    console.log('\n[Case 4 Photos Validation] Testing upload endpoint and generation endpoint with 4 photos...');
    const uploadRes4 = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .attach('images', dummyImg1, 'leader1.jpg')
      .attach('images', dummyImg2, 'leader2.jpg')
      .attach('images', dummyImg3, 'leader3.jpg')
      .attach('images', dummyImg4, 'leader4.jpg');

    console.log('Upload 4 Status:', uploadRes4.status, 'Message:', uploadRes4.body.message);
    if (uploadRes4.status !== 400 || uploadRes4.body.success !== false) {
      throw new Error('Upload API failed to block 4 files!');
    }

    const res4 = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${tokenAlpha}`)
      .send({
        templateId: template._id.toString(),
        occasion: 'বিজয় দিবস',
        headline: 'চার ছবির অবৈধ পোস্টার',
        name: 'লিডার',
        designation: 'পদবী',
        party: 'দল',
        location: 'ঢাকা',
        photoUrls: ['http://a.com/1.jpg', 'http://a.com/2.jpg', 'http://a.com/3.jpg', 'http://a.com/4.jpg'],
      });

    console.log('Generate 4 Status:', res4.status, 'Error:', res4.body.errors?.photoUrls);
    if (res4.status !== 400 || res4.body.success !== false) {
      throw new Error('Generation API failed to block 4 photo URLs!');
    }
    console.log('✓ Case 4 photos verified: Both Upload API (400) and Generation API (400) strictly block >3 photos.');

    // -------------------------------------------------------------
    // SECTION 2: HISTORY & REGENERATION VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- SECTION 2: History & Regeneration ---');

    // 2A. History for logged-in user Alpha
    console.log('\n[History Inspection] Querying User Alpha history...');
    const historyAlphaRes = await request(app)
      .get('/api/posters')
      .set('Authorization', `Bearer ${tokenAlpha}`);

    console.log('User Alpha History Status:', historyAlphaRes.status, 'Total Posters:', historyAlphaRes.body.pagination?.total);
    if (historyAlphaRes.status !== 200 || historyAlphaRes.body.pagination.total !== 4) {
      throw new Error('User Alpha history total count mismatch!');
    }

    // 2B. Cross-user History Access Control
    console.log('[History Isolation] Querying User Beta history...');
    const historyBetaRes = await request(app)
      .get('/api/posters')
      .set('Authorization', `Bearer ${tokenBeta}`);

    console.log('User Beta History Status:', historyBetaRes.status, 'Total Posters:', historyBetaRes.body.pagination?.total);
    if (historyBetaRes.status !== 200 || historyBetaRes.body.pagination.total !== 0) {
      throw new Error('User Beta history isolation failed!');
    }

    console.log('[Regeneration Isolation] User Beta trying to regenerate User Alpha 3-photo poster...');
    const crossRegenRes = await request(app)
      .post(`/api/posters/${posterDoc3._id}/regenerate`)
      .set('Authorization', `Bearer ${tokenBeta}`);

    console.log('Cross-user Regeneration Status:', crossRegenRes.status, 'Message:', crossRegenRes.body.message);
    if (crossRegenRes.status !== 404) {
      throw new Error('Regeneration security failure: User Beta accessed User Alpha poster!');
    }
    console.log('✓ History isolation check passed: User Beta history is empty and cannot access User Alpha posters.');

    // 2C. Multi-Photo Regeneration
    console.log('\n[Multi-Photo Regeneration] User Alpha regenerating 3-photo poster (ID: ' + posterDoc3._id + ')...');
    const regen3Res = await request(app)
      .post(`/api/posters/${posterDoc3._id}/regenerate`)
      .set('Authorization', `Bearer ${tokenAlpha}`);

    console.log('Regenerate 3 Status:', regen3Res.status, 'New Poster ID:', regen3Res.body.data?.posterId);
    if (regen3Res.status !== 201 || !regen3Res.body.data?.posterId) {
      throw new Error('3-photo regeneration failed!');
    }
    if (regen3Res.body.data.posterId === posterDoc3._id.toString()) {
      throw new Error('Regeneration overwrote original poster ID instead of creating a NEW record!');
    }

    const newRegenPosterDoc = await Poster.findById(regen3Res.body.data.posterId);
    if (!newRegenPosterDoc) throw new Error('Regenerated poster record not found in MongoDB');
    if (
      !Array.isArray(newRegenPosterDoc.originalImageUrls) ||
      newRegenPosterDoc.originalImageUrls.length !== 3 ||
      newRegenPosterDoc.originalImageUrls[0] !== urls3[0] ||
      newRegenPosterDoc.originalImageUrls[1] !== urls3[1] ||
      newRegenPosterDoc.originalImageUrls[2] !== urls3[2]
    ) {
      throw new Error('Regenerated poster failed to retain all 3 original photo URLs!');
    }

    const originalPosterDoc3StillExists = await Poster.findById(posterDoc3._id);
    if (!originalPosterDoc3StillExists) {
      throw new Error('Original poster was deleted/overwritten!');
    }
    console.log('✓ Multi-photo regeneration verified: Retained all 3 original photo URLs, created NEW record (' + newRegenPosterDoc._id + '), original record (' + posterDoc3._id + ') preserved.');

    // 2D. Legacy Single-Photo Poster Regeneration
    console.log('\n[Legacy Poster Regeneration] Seeding legacy poster with only originalImageUrl...');
    const legacyPosterDoc = await Poster.create({
      userId: userAlpha._id,
      templateId: template._id,
      occasion: 'পুরাতন অনুষ্ঠান',
      headline: 'লিগ্যাসি এক ছবি পোস্টার',
      name: 'পুরাতন সদস্য',
      designation: 'সদস্য',
      party: 'দল',
      location: 'ঢাকা',
      originalImageUrl: 'https://cloudinary.com/legacy_single_photo.jpg',
      generatedImageUrl: 'https://cloudinary.com/legacy_gen.png',
      generatedImagePublicId: 'legacy_gen_id',
      layout: {
        backgroundColor: '#004D40',
        accentColor: '#FFD700',
        photoPlacement: 'center-circle',
        headlinePlacement: 'below-photo',
        decorativeStyle: 'patriotic-flag',
      },
    });

    console.log('Legacy Poster created. ID:', legacyPosterDoc._id.toString());
    const legacyRegenRes = await request(app)
      .post(`/api/posters/${legacyPosterDoc._id}/regenerate`)
      .set('Authorization', `Bearer ${tokenAlpha}`);

    console.log('Legacy Regenerate Status:', legacyRegenRes.status, 'New Poster ID:', legacyRegenRes.body.data?.posterId);
    if (legacyRegenRes.status !== 201 || !legacyRegenRes.body.data?.posterId) {
      throw new Error('Legacy poster regeneration failed!');
    }
    const newLegacyRegenDoc = await Poster.findById(legacyRegenRes.body.data.posterId);
    if (!newLegacyRegenDoc) throw new Error('Regenerated legacy poster not found in DB');
    if (
      !Array.isArray(newLegacyRegenDoc.originalImageUrls) ||
      newLegacyRegenDoc.originalImageUrls.length !== 1 ||
      newLegacyRegenDoc.originalImageUrls[0] !== 'https://cloudinary.com/legacy_single_photo.jpg'
    ) {
      throw new Error('Legacy poster regeneration failed to inherit photo URL!');
    }
    console.log('✓ Legacy single-photo poster regeneration verified: Legacy poster successfully regenerated and inherited photo URL.');

    console.log('\n================================================================');
    console.log('=== ALL BACKEND & DATABASE E2E VERIFICATIONS PASSED CLEANLY! ===');
    console.log('================================================================\n');

  } catch (error: any) {
    console.error('Step 2E E2E Verification failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    process.exit(process.exitCode || 0);
  }
}

runStep2EFullVerification();
