import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { User } from '../models/user.model.js';
import { Template } from '../models/template.model.js';
import { Poster } from '../models/poster.model.js';
import { generateToken } from '../utils/jwt.js';
import cloudinary from '../services/cloudinary.service.js';

async function runPosterApiTest() {
  console.log('=== TEST: Poster Generation API Endpoint Validation & Security (POST /api/posters/generate) ===');

  let mongoServer: MongoMemoryServer | null = null;

  try {
    // 1. Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✓ In-memory MongoDB connected successfully.');

    // 2. Create seed Users and Templates (Active & Inactive)
    const testUser = await User.create({
      name: 'API Candidate',
      email: 'candidate_api@test.com',
      passwordHash: 'hashed_password_123',
      role: 'user',
    });

    const strangerUser = await User.create({
      name: 'Stranger User',
      email: 'stranger@test.com',
      passwordHash: 'hashed_password_456',
      role: 'user',
    });

    const activeTemplate = await Template.create({
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

    const inactiveTemplate = await Template.create({
      name: 'Disabled Draft Poster Template',
      occasion: 'draft-event',
      description: 'Deactivated template',
      previewUrl: 'https://placehold.co/600x800.png',
      isActive: false,
    });

    // 3. Stub Cloudinary uploader.upload_stream
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
          console.log(`✓ Cloudinary upload_stream called! Received PNG Buffer (${buffer.length} bytes)`);
        },
      } as any;
    }) as any;

    const validToken = generateToken({
      userId: testUser._id.toString(),
      email: testUser.email,
      role: testUser.role,
    });

    const validPayload = {
      templateId: activeTemplate._id.toString(),
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
    if (res1.status !== 401 || res1.body.success !== false) {
      throw new Error('Unauthenticated request was not rejected with 401!');
    }
    console.log('✓ 401 Unauthorized check passed.');

    // TEST 2: Invalid templateId format (e.g. "123-abc") should return 400
    console.log('\n--- 2. Testing Invalid templateId Format ("123-abc") ---');
    const res2 = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ ...validPayload, templateId: '123-abc' });

    console.log('Status Code:', res2.status, 'Errors:', res2.body.errors);
    if (res2.status !== 400 || res2.body.success !== false || !res2.body.errors?.templateId) {
      throw new Error('Invalid templateId format "123-abc" was not rejected with 400!');
    }
    console.log('✓ 400 Bad Request check passed for invalid templateId format.');

    // TEST 3: Missing required fields individually should return 400
    console.log('\n--- 3. Testing Missing Required Fields Individually ---');
    const requiredFields = ['templateId', 'occasion', 'headline', 'name', 'designation', 'party', 'location'];

    for (const field of requiredFields) {
      const payload: any = { ...validPayload };
      delete payload[field];

      const resField = await request(app)
        .post('/api/posters/generate')
        .set('Authorization', `Bearer ${validToken}`)
        .send(payload);

      console.log(`Missing '${field}' Status Code:`, resField.status, 'Error:', resField.body.errors?.[field]);
      if (resField.status !== 400 || resField.body.success !== false || !resField.body.errors?.[field]) {
        throw new Error(`Missing required field '${field}' was not rejected with 400!`);
      }
    }
    console.log('✓ 400 Bad Request check passed for all individual missing required fields.');

    // TEST 4: Whitespace-only values should return 400
    console.log('\n--- 4. Testing Whitespace-Only String Fields ---');
    const stringFields = ['occasion', 'headline', 'name', 'designation', 'party', 'location'];

    for (const field of stringFields) {
      const payload = { ...validPayload, [field]: '    ' };

      const resSpace = await request(app)
        .post('/api/posters/generate')
        .set('Authorization', `Bearer ${validToken}`)
        .send(payload);

      console.log(`Whitespace '${field}' Status Code:`, resSpace.status, 'Error:', resSpace.body.errors?.[field]);
      if (resSpace.status !== 400 || resSpace.body.success !== false || !resSpace.body.errors?.[field]) {
        throw new Error(`Whitespace-only field '${field}' was not rejected with 400!`);
      }
    }
    console.log('✓ 400 Bad Request check passed for all whitespace-only string fields.');

    // TEST 5: Incorrect Field Data Types should return 400
    console.log('\n--- 5. Testing Incorrect Data Types ---');
    const typeTests = [
      { field: 'templateId', value: 12345, desc: 'number for templateId' },
      { field: 'occasion', value: false, desc: 'boolean for occasion' },
      { field: 'headline', value: 99999, desc: 'number for headline' },
      { field: 'name', value: true, desc: 'boolean for name' },
      { field: 'designation', value: { title: 'Leader' }, desc: 'object for designation' },
      { field: 'party', value: ['PartyA', 'PartyB'], desc: 'array for party' },
      { field: 'location', value: 54321, desc: 'number for location' },
    ];

    for (const test of typeTests) {
      const payload = { ...validPayload, [test.field]: test.value };

      const resType = await request(app)
        .post('/api/posters/generate')
        .set('Authorization', `Bearer ${validToken}`)
        .send(payload);

      console.log(`Type mismatch (${test.desc}) Status Code:`, resType.status, 'Error:', resType.body.errors?.[test.field]);
      if (resType.status !== 400 || resType.body.success !== false || !resType.body.errors?.[test.field]) {
        throw new Error(`Incorrect field type for '${test.field}' (${test.desc}) was not rejected with 400!`);
      }
    }
    console.log('✓ 400 Bad Request check passed for incorrect field data types.');

    // TEST 6: Extra unexpected properties & userId override prevention
    console.log('\n--- 6. Testing Extra Unexpected Properties & userId Override Prevention ---');
    const payloadWithExtra = {
      ...validPayload,
      userId: strangerUser._id.toString(), // Attempting to override authenticated user!
      unexpectedHackerProp: 'malicious payload',
    };

    const res6 = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${validToken}`)
      .send(payloadWithExtra);

    console.log('Status Code:', res6.status);
    console.log('Created Poster ID:', res6.body.data?.posterId);

    if (res6.status !== 201 || res6.body.success !== true) {
      throw new Error('Valid request with extra fields failed!');
    }

    const createdPoster = await Poster.findById(res6.body.data.posterId);
    if (!createdPoster) {
      throw new Error('Created poster was not found in MongoDB!');
    }

    if (createdPoster.userId.toString() !== testUser._id.toString()) {
      throw new Error('SECURITY VIOLATION: User ID was overridden by request payload!');
    }
    console.log('✓ Security check passed: Authenticated user ID enforced, request payload userId override ignored.');

    // TEST 7: Inactive template (isActive: false) should return 404 & create no poster
    console.log('\n--- 7. Testing Inactive Template Rejection (isActive: false) ---');
    const inactivePayload = { ...validPayload, templateId: inactiveTemplate._id.toString() };

    const posterCountBefore = await Poster.countDocuments();

    const res7 = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${validToken}`)
      .send(inactivePayload);

    console.log('Status Code:', res7.status);
    console.log('Response Message:', res7.body.message);

    const posterCountAfter = await Poster.countDocuments();

    if (res7.status !== 404 || res7.body.success !== false) {
      throw new Error('Inactive template generation request was not rejected with 404!');
    }

    if (posterCountAfter !== posterCountBefore) {
      throw new Error('Poster document was erroneously created for an inactive template!');
    }
    console.log('✓ 404 Not Found check passed for inactive template, no poster created.');

    // TEST 8: Non-existent Template ID (valid ObjectId not in DB) should return 404
    console.log('\n--- 8. Testing Non-Existent Template ID ---');
    const nonExistentTemplateId = new mongoose.Types.ObjectId().toString();
    const res8 = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ ...validPayload, templateId: nonExistentTemplateId });

    console.log('Status Code:', res8.status);
    if (res8.status !== 404 || res8.body.success !== false) {
      throw new Error('Non-existent template ID request did not return 404!');
    }
    console.log('✓ 404 Not Found check passed for non-existent template ID.');

    // TEST 9: Maximum Field Length Exceeded Rejection -> 400 Bad Request
    console.log('\n--- 9. Testing Maximum Field Length Exceeded Rejection ---');
    const maxLenTests = [
      { field: 'occasion', max: 100, val: 'A'.repeat(101) },
      { field: 'headline', max: 200, val: 'B'.repeat(201) },
      { field: 'name', max: 100, val: 'C'.repeat(101) },
      { field: 'designation', max: 150, val: 'D'.repeat(151) },
      { field: 'party', max: 100, val: 'E'.repeat(101) },
      { field: 'location', max: 100, val: 'F'.repeat(101) },
    ];

    for (const test of maxLenTests) {
      const payload = { ...validPayload, [test.field]: test.val };
      const resMax = await request(app)
        .post('/api/posters/generate')
        .set('Authorization', `Bearer ${validToken}`)
        .send(payload);

      console.log(`Exceeded max length for '${test.field}' (${test.val.length} chars) Status Code:`, resMax.status, 'Error:', resMax.body.errors?.[test.field]);
      if (resMax.status !== 400 || resMax.body.success !== false || !resMax.body.errors?.[test.field]) {
        throw new Error(`Field '${test.field}' exceeding max length ${test.max} was not rejected with 400!`);
      }
    }
    console.log('✓ 400 Bad Request check passed for all maximum field length violations.');

    // TEST 10: Valid-Length Fields at Max Boundary Succeed -> 201 Created
    console.log('\n--- 10. Testing Valid Text Fields at Maximum Allowed Length ---');
    const maxBoundaryPayload = {
      ...validPayload,
      occasion: 'X'.repeat(100),
      headline: 'Y'.repeat(200),
      name: 'Z'.repeat(100),
      designation: 'W'.repeat(150),
      party: 'P'.repeat(100),
      location: 'L'.repeat(100),
    };
    const resBoundary = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${validToken}`)
      .send(maxBoundaryPayload);

    console.log('Status Code:', resBoundary.status);
    if (resBoundary.status !== 201 || resBoundary.body.success !== true) {
      throw new Error('Valid max boundary length fields request failed!');
    }
    console.log('✓ 201 Created check passed for maximum allowed text field lengths.');

    // TEST 11: photoUrl Protocol & Format Validation
    console.log('\n--- 11. Testing photoUrl Protocol & Format Validation ---');

    // 11a. Valid http:// photoUrl -> 201
    const resHttp = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ ...validPayload, photoUrl: 'http://placehold.co/400x400.png' });
    console.log('http:// photoUrl Status Code:', resHttp.status);
    if (resHttp.status !== 201 || resHttp.body.success !== true) {
      throw new Error('Valid http:// photoUrl was rejected!');
    }

    // 11b. Valid https:// photoUrl -> 201
    const resHttps = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ ...validPayload, photoUrl: 'https://placehold.co/400x400.png' });
    console.log('https:// photoUrl Status Code:', resHttps.status);
    if (resHttps.status !== 201 || resHttps.body.success !== true) {
      throw new Error('Valid https:// photoUrl was rejected!');
    }

    // 11c. Missing / Omitted photoUrl -> 201
    const missingPhotoPayload: any = { ...validPayload };
    delete missingPhotoPayload.photoUrl;
    const resMissingPhoto = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${validToken}`)
      .send(missingPhotoPayload);
    console.log('Missing photoUrl Status Code:', resMissingPhoto.status);
    if (resMissingPhoto.status !== 201 || resMissingPhoto.body.success !== true) {
      throw new Error('Missing photoUrl request was rejected!');
    }

    // 11d. Invalid URL string ("not-a-url") -> 400
    const resInvalidUrl = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ ...validPayload, photoUrl: 'not-a-url' });
    console.log('not-a-url Status Code:', resInvalidUrl.status, 'Error:', resInvalidUrl.body.errors?.photoUrl);
    if (resInvalidUrl.status !== 400 || resInvalidUrl.body.success !== false) {
      throw new Error('Invalid URL string "not-a-url" was not rejected with 400!');
    }

    // 11e. Unsupported Protocol ("javascript:alert(1)") -> 400
    const resJsUrl = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ ...validPayload, photoUrl: 'javascript:alert(1)' });
    console.log('javascript: protocol Status Code:', resJsUrl.status, 'Error:', resJsUrl.body.errors?.photoUrl);
    if (resJsUrl.status !== 400 || resJsUrl.body.success !== false) {
      throw new Error('Unsupported protocol "javascript:..." was not rejected with 400!');
    }

    // 11f. Unsupported Protocol ("ftp://example.com/photo.jpg") -> 400
    const resFtpUrl = await request(app)
      .post('/api/posters/generate')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ ...validPayload, photoUrl: 'ftp://example.com/photo.jpg' });
    console.log('ftp:// protocol Status Code:', resFtpUrl.status, 'Error:', resFtpUrl.body.errors?.photoUrl);
    if (resFtpUrl.status !== 400 || resFtpUrl.body.success !== false) {
      throw new Error('Unsupported protocol "ftp://..." was not rejected with 400!');
    }

    console.log('✓ photoUrl validation checks passed for http, https, omitted, invalid, and unsupported protocols.');

    console.log('\nAll Poster API endpoint validation & security tests passed successfully!');
  } catch (error: any) {
    console.error('API Test failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    process.exit(process.exitCode || 0);
  }
}

runPosterApiTest();
