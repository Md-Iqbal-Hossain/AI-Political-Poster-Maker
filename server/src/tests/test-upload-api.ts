import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { User } from '../models/user.model.js';
import { generateToken } from '../utils/jwt.js';
import cloudinary from '../services/cloudinary.service.js';

async function runUploadApiTest() {
  console.log('=== TEST: Image Upload API Endpoint Validation & Authentication ===');

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
    const mockSecureUrl = 'https://res.cloudinary.com/test/image/upload/v12345/political_posters/test_upload.jpg';
    const mockPublicId = 'political_posters/test_upload_123';

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
          console.log(`✓ Cloudinary upload_stream mock called! Received buffer (${buffer.length} bytes)`);
        },
      } as any;
    }) as any;

    // TEST 1: Unauthenticated upload should return 401
    console.log('\n--- 1. Testing Unauthenticated Upload Request ---');
    const res1 = await request(app)
      .post('/api/uploads/image')
      .attach('image', Buffer.from('fake image content'), 'test.jpg');

    console.log('Status Code:', res1.status);
    console.log('Response Body:', res1.body);
    if (res1.status !== 401 || res1.body.success !== false) {
      throw new Error('Unauthenticated upload request was not rejected with 401!');
    }
    console.log('✓ 401 Unauthorized check passed.');

    // TEST 2: Request without attached file should return 400
    console.log('\n--- 2. Testing Request Without Attached File ---');
    const res2 = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    console.log('Status Code:', res2.status);
    console.log('Response Body:', res2.body);
    if (res2.status !== 400 || res2.body.success !== false) {
      throw new Error('Missing file upload request was not rejected with 400!');
    }
    console.log('✓ 400 Bad Request check passed for missing file.');

    // TEST 3: File larger than 5MB should return 400
    console.log('\n--- 3. Testing Oversized File Upload (>5MB) ---');
    const sixMbBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB dummy buffer
    const res3 = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('image', sixMbBuffer, 'large_photo.jpg');

    console.log('Status Code:', res3.status);
    console.log('Response Body:', res3.body);
    if (res3.status !== 400 || res3.body.success !== false) {
      throw new Error('Oversized file upload (>5MB) was not rejected with 400!');
    }
    console.log('✓ 400 Bad Request check passed for oversized file.');

    // TEST 4: Invalid File Types (PDF, GIF, TXT) should return 400
    console.log('\n--- 4. Testing Invalid File Types Rejection (PDF, GIF, TXT) ---');

    // 4a. PDF
    const resPdf = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('image', Buffer.from('%PDF-1.4 fake pdf content'), {
        filename: 'document.pdf',
        contentType: 'application/pdf',
      });
    console.log('PDF Status Code:', resPdf.status, 'Message:', resPdf.body.message);
    if (resPdf.status !== 400 || resPdf.body.success !== false) {
      throw new Error('PDF file upload was not rejected with 400!');
    }

    // 4b. GIF
    const resGif = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('image', Buffer.from('GIF89a fake gif content'), {
        filename: 'animation.gif',
        contentType: 'image/gif',
      });
    console.log('GIF Status Code:', resGif.status, 'Message:', resGif.body.message);
    if (resGif.status !== 400 || resGif.body.success !== false) {
      throw new Error('GIF file upload was not rejected with 400!');
    }

    // 4c. TXT
    const resTxt = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('image', Buffer.from('hello world notes'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });
    console.log('TXT Status Code:', resTxt.status, 'Message:', resTxt.body.message);
    if (resTxt.status !== 400 || resTxt.body.success !== false) {
      throw new Error('TXT file upload was not rejected with 400!');
    }
    console.log('✓ 400 Bad Request check passed for invalid file types (PDF, GIF, TXT).');

    // TEST 5: Valid File Types (JPEG, PNG, WEBP) should return 200 OK
    console.log('\n--- 5. Testing Valid File Uploads (JPEG, PNG, WEBP) ---');

    // 5a. JPEG
    const resJpeg = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('image', Buffer.from('fake jpeg image data'), {
        filename: 'leader_photo.jpg',
        contentType: 'image/jpeg',
      });
    console.log('JPEG Status Code:', resJpeg.status, 'Body:', resJpeg.body);
    if (resJpeg.status !== 200 || resJpeg.body.success !== true) {
      throw new Error('Valid JPEG file upload failed!');
    }

    // 5b. PNG
    const resPng = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('image', Buffer.from('fake png image data'), {
        filename: 'leader_photo.png',
        contentType: 'image/png',
      });
    console.log('PNG Status Code:', resPng.status, 'Body:', resPng.body);
    if (resPng.status !== 200 || resPng.body.success !== true) {
      throw new Error('Valid PNG file upload failed!');
    }

    // 5c. WEBP
    const resWebp = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('image', Buffer.from('fake webp image data'), {
        filename: 'leader_photo.webp',
        contentType: 'image/webp',
      });
    console.log('WEBP Status Code:', resWebp.status, 'Body:', resWebp.body);
    if (resWebp.status !== 200 || resWebp.body.success !== true) {
      throw new Error('Valid WEBP file upload failed!');
    }

    console.log('✓ 200 OK check passed for all valid file types (JPEG, PNG, WEBP).');

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

