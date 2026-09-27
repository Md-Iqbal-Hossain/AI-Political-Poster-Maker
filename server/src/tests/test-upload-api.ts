import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { User } from '../models/user.model.js';
import { generateToken } from '../utils/jwt.js';
import cloudinary from '../services/cloudinary.service.js';

async function runUploadApiTest() {
  console.log('=== TEST: Image Upload API Endpoint Multi-Image Validation & Authentication ===');

  let mongoServer: MongoMemoryServer | null = null;

  try {
    // 1. Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✓ In-memory MongoDB connected successfully.');

    // 2. Create seed User & generate JWT token
    const testUser = await User.create({
      name: 'Upload Test User',
      email: 'upload_test@test.com',
      passwordHash: 'hashed_password_123',
      role: 'user',
    });

    const validToken = generateToken({
      userId: testUser._id.toString(),
      email: testUser.email,
      role: testUser.role,
    });

    // 3. Stub Cloudinary upload_stream to prevent real network calls
    let uploadCallCount = 0;
    cloudinary.uploader.upload_stream = ((options: any, callback: any) => {
      uploadCallCount++;
      const mockUrl = `https://res.cloudinary.com/test/image/upload/v12345/political_posters/test_upload_${uploadCallCount}.jpg`;
      const mockId = `political_posters/test_upload_${uploadCallCount}`;

      setTimeout(() => {
        if (callback) {
          callback(null, {
            secure_url: mockUrl,
            public_id: mockId,
          });
        }
      }, 10);

      return {
        end: (buffer: Buffer) => {
          console.log(`  [Mock Cloudinary] Stream buffer received (${buffer.length} bytes)`);
        },
      } as any;
    }) as any;

    // TEST 1: Unauthenticated multi-upload should return 401
    console.log('\n--- 1. Testing Unauthenticated Multi-Upload Request ---');
    const res1 = await request(app)
      .post('/api/uploads/image')
      .attach('images', Buffer.from('fake image 1'), 'photo1.jpg')
      .attach('images', Buffer.from('fake image 2'), 'photo2.jpg');

    console.log('Status Code:', res1.status);
    console.log('Response Body:', res1.body);
    if (res1.status !== 401 || res1.body.success !== false) {
      throw new Error('Unauthenticated multi-upload request was not rejected with 401!');
    }
    console.log('✓ 401 Unauthorized check passed.');

    // TEST 2: Request without attached files should return 400
    console.log('\n--- 2. Testing Request Without Attached Files ---');
    const res2 = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    console.log('Status Code:', res2.status);
    console.log('Response Body:', res2.body);
    if (res2.status !== 400 || res2.body.success !== false) {
      throw new Error('Missing file upload request was not rejected with 400!');
    }
    console.log('✓ 400 Bad Request check passed for missing files.');

    // TEST 3: Oversized File Upload (>5MB) should return 400
    console.log('\n--- 3. Testing Oversized File Upload (>5MB) ---');
    const sixMbBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB dummy buffer
    const res3 = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('images', sixMbBuffer, 'large_photo.jpg');

    console.log('Status Code:', res3.status);
    console.log('Response Body:', res3.body);
    if (res3.status !== 400 || res3.body.success !== false) {
      throw new Error('Oversized file upload (>5MB) was not rejected with 400!');
    }
    console.log('✓ 400 Bad Request check passed for oversized file.');

    // TEST 4: Invalid File Types (PDF, GIF, TXT) should return 400
    console.log('\n--- 4. Testing Invalid File Types Rejection (PDF, GIF, TXT) ---');
    const resPdf = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('images', Buffer.from('%PDF-1.4 fake pdf content'), {
        filename: 'document.pdf',
        contentType: 'application/pdf',
      });
    console.log('PDF Status Code:', resPdf.status, 'Message:', resPdf.body.message);
    if (resPdf.status !== 400 || resPdf.body.success !== false) {
      throw new Error('PDF file upload was not rejected with 400!');
    }
    console.log('✓ 400 Bad Request check passed for invalid file types.');

    // TEST 5: Uploading 1 Valid Image ('images' field) should return 200 OK
    console.log('\n--- 5. Testing Uploading 1 Valid Image ---');
    const resSingle = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('images', Buffer.from('fake image 1 data'), {
        filename: 'leader1.jpg',
        contentType: 'image/jpeg',
      });
    console.log('1 Image Status Code:', resSingle.status, 'Body:', resSingle.body);
    if (resSingle.status !== 200 || !resSingle.body.success || !Array.isArray(resSingle.body.images) || resSingle.body.images.length !== 1) {
      throw new Error('1 valid image upload failed or did not return expected images array!');
    }
    console.log('✓ 200 OK check passed for 1 valid image.');

    // TEST 6: Uploading 2 Valid Images should return 200 OK
    console.log('\n--- 6. Testing Uploading 2 Valid Images ---');
    const resTwo = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('images', Buffer.from('fake image 1 data'), {
        filename: 'leader1.png',
        contentType: 'image/png',
      })
      .attach('images', Buffer.from('fake image 2 data'), {
        filename: 'leader2.webp',
        contentType: 'image/webp',
      });
    console.log('2 Images Status Code:', resTwo.status, 'Body:', resTwo.body);
    if (resTwo.status !== 200 || !resTwo.body.success || resTwo.body.images.length !== 2) {
      throw new Error('2 valid images upload failed!');
    }
    console.log('✓ 200 OK check passed for 2 valid images.');

    // TEST 7: Uploading 3 Valid Images should return 200 OK
    console.log('\n--- 7. Testing Uploading 3 Valid Images ---');
    const resThree = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('images', Buffer.from('fake image 1 data'), {
        filename: 'leader1.jpg',
        contentType: 'image/jpeg',
      })
      .attach('images', Buffer.from('fake image 2 data'), {
        filename: 'leader2.jpg',
        contentType: 'image/jpeg',
      })
      .attach('images', Buffer.from('fake image 3 data'), {
        filename: 'leader3.jpg',
        contentType: 'image/jpeg',
      });
    console.log('3 Images Status Code:', resThree.status, 'Body:', resThree.body);
    if (resThree.status !== 200 || !resThree.body.success || resThree.body.images.length !== 3) {
      throw new Error('3 valid images upload failed!');
    }
    console.log('✓ 200 OK check passed for 3 valid images.');

    // TEST 8: Uploading 4 Images (>3 max limit) should return 400 Bad Request
    console.log('\n--- 8. Testing Uploading 4 Images (>3 limit) ---');
    const resFour = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('images', Buffer.from('fake image 1'), 'img1.jpg')
      .attach('images', Buffer.from('fake image 2'), 'img2.jpg')
      .attach('images', Buffer.from('fake image 3'), 'img3.jpg')
      .attach('images', Buffer.from('fake image 4'), 'img4.jpg');
    console.log('4 Images Status Code:', resFour.status, 'Body:', resFour.body);
    if (resFour.status !== 400 || resFour.body.success !== false) {
      throw new Error('4 image files upload was not rejected with 400!');
    }
    console.log('✓ 400 Bad Request check passed for >3 images.');

    // TEST 9: Backward Compatibility - Legacy Single 'image' Field
    console.log('\n--- 9. Testing Backward Compatibility (Legacy field "image") ---');
    const resLegacy = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('image', Buffer.from('legacy single image data'), {
        filename: 'legacy.jpg',
        contentType: 'image/jpeg',
      });
    console.log('Legacy Status Code:', resLegacy.status, 'Body:', resLegacy.body);
    if (resLegacy.status !== 200 || !resLegacy.body.success || !resLegacy.body.secureUrl) {
      throw new Error('Backward compatibility legacy image field upload failed!');
    }
    console.log('✓ 200 OK check passed for backward-compatible legacy single image field.');

    console.log('\nAll Upload API endpoint tests passed successfully!');
  } catch (error: any) {
    console.error('Upload API Test failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    process.exit(process.exitCode || 0);
  }
}

runUploadApiTest();


