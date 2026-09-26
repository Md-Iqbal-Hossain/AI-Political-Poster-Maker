import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Template } from '../models/template.model.js';
import { Poster } from '../models/poster.model.js';
import { User } from '../models/user.model.js';
import { createPoster, CreatePosterInput } from '../services/poster-generation.service.js';
import cloudinary from '../services/cloudinary.service.js';

async function runPosterGenerationTest() {
  console.log('=== TEST: Poster Generation Service Pipeline ===');

  let mongoServer: MongoMemoryServer | null = null;

  try {
    // 1. Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✓ In-memory MongoDB connected successfully.');

    // 2. Create seed User and Template
    const testUser = await User.create({
      name: 'Test Candidate',
      email: 'candidate@test.com',
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

    console.log('✓ Seed User created:', testUser._id.toString());
    console.log('✓ Seed Template created:', testTemplate._id.toString());

    // 3. Stub Cloudinary uploader.upload_stream for isolated safe test execution
    const mockSecureUrl = 'https://res.cloudinary.com/test/image/upload/v12345/ai-political-posters/generated/test_poster.png';
    const mockPublicId = 'ai-political-posters/generated/test_poster_123';

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
          console.log(`✓ Cloudinary upload_stream called! Received PNG Buffer (${buffer.length} bytes), Target Folder: "${options?.folder}"`);
        },
      } as any;
    }) as any;

    // 4. Invoke createPoster service
    const input: CreatePosterInput = {
      userId: testUser._id.toString(),
      templateId: testTemplate._id.toString(),
      occasion: 'বিজয় দিবস',
      headline: 'সবাইকে মহান বিজয় দিবসের শুভেচ্ছা ও অভিনন্দন',
      name: 'মোঃ জহিরুল ইসলাম',
      designation: 'সাধারণ সম্পাদক, বাংলাদেশ ছাত্র ফ্রন্ট',
      party: 'বাংলাদেশ ছাত্র ফ্রন্ট',
      location: 'ঢাকা উত্তর শাখা',
      photoUrl: 'https://placehold.co/400x400/006a4e/ffffff.png?text=Leader',
    };

    const startTime = Date.now();
    const result = await createPoster(input);
    const duration = Date.now() - startTime;

    console.log(`✓ Poster generation pipeline executed in ${duration}ms`);

    // 5. Verify returned result structure
    console.log('✓ Returned posterId:', result.posterId);
    console.log('✓ Returned generatedImageUrl:', result.generatedImageUrl);
    console.log('✓ Returned generatedImagePublicId:', result.generatedImagePublicId);
    console.log('✓ Returned templateId:', result.templateId);
    console.log('✓ Returned layout:', JSON.stringify(result.layout, null, 2));

    if (
      !result.posterId ||
      result.generatedImageUrl !== mockSecureUrl ||
      result.generatedImagePublicId !== mockPublicId ||
      result.templateId !== testTemplate._id.toString()
    ) {
      throw new Error('Returned result structure does not match expected output!');
    }

    // 6. Verify Poster document saved in MongoDB
    const savedPoster = await Poster.findById(result.posterId);
    if (!savedPoster) {
      throw new Error('Poster document was not found in MongoDB!');
    }

    console.log('✓ Saved MongoDB Poster Document Verified:');
    console.log('  - DB ID:', savedPoster._id.toString());
    console.log('  - userId:', savedPoster.userId.toString());
    console.log('  - templateId:', savedPoster.templateId.toString());
    console.log('  - headline:', savedPoster.headline);
    console.log('  - generatedImageUrl:', savedPoster.generatedImageUrl);
    console.log('  - layout:', savedPoster.layout);

    if (
      savedPoster.userId.toString() !== testUser._id.toString() ||
      savedPoster.templateId.toString() !== testTemplate._id.toString() ||
      savedPoster.headline !== input.headline ||
      savedPoster.name !== input.name
    ) {
      throw new Error('MongoDB Poster document fields do not match input data!');
    }

    // 7. Verify non-existent template error handling
    console.log('\nTesting non-existent template error handling...');
    const fakeTemplateId = new mongoose.Types.ObjectId().toString();
    try {
      await createPoster({ ...input, templateId: fakeTemplateId });
      throw new Error('Should have thrown error for non-existent template!');
    } catch (err: any) {
      console.log('✓ Clear error thrown for non-existent template:', err.message);
    }

    console.log('\nAll Poster Generation Service tests passed successfully!');
  } catch (error: any) {
    console.error('Poster generation test failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
}

runPosterGenerationTest();
