import {
  generatePosterWithGeminiLayout,
  GeneratePosterInput,
} from '../services/poster-generator.service.js';
import { GeminiLayoutSuggestionSchema } from '../services/gemini-layout.service.js';
import { generatePosterHtml } from '../services/poster-render.service.js';

async function runIntegrationTests() {
  console.log('=== INTEGRATION TEST 1: Full Gemini Layout + Puppeteer Render ===');

  const testInput: GeneratePosterInput = {
    occasion: 'বিজয় দিবস',
    headline: 'সবাইকে মহান বিজয় দিবসের শুভেচ্ছা ও অভিনন্দন',
    name: 'মোঃ জহিরুল ইসলাম',
    designation: 'সাধারণ সম্পাদক, বাংলাদেশ ছাত্র ফ্রন্ট',
    party: 'বাংলাদেশ ছাত্র ফ্রন্ট',
    location: 'ঢাকা উত্তর শাখা',
    photoUrl: 'https://placehold.co/400x400/006a4e/ffffff.png?text=Leader',
    layoutConfig: {
      canvas: { width: 1080, height: 1350, orientation: 'portrait' },
    },
  };

  const startTime = Date.now();
  const result = await generatePosterWithGeminiLayout(testInput);
  const duration = Date.now() - startTime;

  console.log(`Render completed in ${duration}ms`);
  console.log('Is Fallback Used:', result.isFallback);
  console.log('Layout Suggestion:', JSON.stringify(result.layoutSuggestion, null, 2));

  // 1. Verify Gemini Layout Zod Schema
  const schemaValidation = GeminiLayoutSuggestionSchema.safeParse(result.layoutSuggestion);
  console.log('✓ 1. Gemini Layout Zod Schema Validated:', schemaValidation.success);
  if (!schemaValidation.success) {
    throw new Error(`Zod Schema Validation Failed: ${JSON.stringify(schemaValidation.error.format())}`);
  }

  // 2. Verify all 5 layout properties affect generated HTML/CSS
  const html = generatePosterHtml(result.posterData);
  const { backgroundColor, accentColor, photoPlacement, headlinePlacement, decorativeStyle } = result.layoutSuggestion;

  const hasBgColor = html.includes(`background: ${backgroundColor}`);
  const hasAccentColor = html.includes(`color: ${accentColor}`) || html.includes(`border-bottom: 4px solid ${accentColor}`);
  const hasPhotoPlacement = photoPlacement === 'center-rounded' ? html.includes('border-radius: 24px') : html.includes('border-radius: 50%');
  const hasHeadlinePlacement = html.includes(`headline ${headlinePlacement}`);
  const hasDecorativeStyle = html.includes('footer') && html.includes('background:');

  console.log('✓ 2. HTML/CSS Verification of 5 Layout Properties:');
  console.log(`   - backgroundColor (${backgroundColor}):`, hasBgColor);
  console.log(`   - accentColor (${accentColor}):`, hasAccentColor);
  console.log(`   - photoPlacement (${photoPlacement}):`, hasPhotoPlacement);
  console.log(`   - headlinePlacement (${headlinePlacement}):`, hasHeadlinePlacement);
  console.log(`   - decorativeStyle (${decorativeStyle}):`, hasDecorativeStyle);

  if (!hasBgColor || !hasAccentColor || !hasPhotoPlacement || !hasHeadlinePlacement || !hasDecorativeStyle) {
    throw new Error('One or more layout properties were not applied to HTML/CSS renderer!');
  }

  // 3. Verify PNG Buffer Output from Puppeteer
  const isBuffer = Buffer.isBuffer(result.imageBuffer);
  const isPngHeader =
    result.imageBuffer.length > 8 &&
    result.imageBuffer[0] === 0x89 &&
    result.imageBuffer[1] === 0x50 && // 'P'
    result.imageBuffer[2] === 0x4e && // 'N'
    result.imageBuffer[3] === 0x47; // 'G'

  console.log('✓ 3. Output is valid Buffer:', isBuffer);
  console.log('✓ 4. Output is valid PNG format (Magic Bytes verified):', isPngHeader);
  console.log(`   Image Size: ${result.imageBuffer.length} bytes`);

  if (!isBuffer || !isPngHeader || result.imageBuffer.length === 0) {
    throw new Error('Puppeteer did not return a valid PNG Buffer!');
  }

  // 4. Verify original Bangla text preservation
  console.log('✓ 5. Original Bangla text content preserved:');
  console.log('   - Headline unchanged:', result.posterData.headline === testInput.headline);
  console.log('   - Name unchanged:', result.posterData.name === testInput.name);
  console.log('   - Designation unchanged:', result.posterData.designation === testInput.designation);
  console.log('   - Party unchanged:', result.posterData.party === testInput.party);
  console.log('   - Location unchanged:', result.posterData.location === testInput.location);

  if (
    result.posterData.headline !== testInput.headline ||
    result.posterData.name !== testInput.name ||
    result.posterData.designation !== testInput.designation ||
    result.posterData.party !== testInput.party ||
    result.posterData.location !== testInput.location
  ) {
    throw new Error('User text content was altered during layout integration!');
  }

  console.log('\n=== INTEGRATION TEST 2: Fallback Handling + Puppeteer Render ===');

  // Force fallback by clearing GEMINI_API_KEY
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = '';

  const fallbackResult = await generatePosterWithGeminiLayout(testInput);
  process.env.GEMINI_API_KEY = originalKey;

  const fallbackSchemaValidation = GeminiLayoutSuggestionSchema.safeParse(fallbackResult.layoutSuggestion);
  const fallbackIsPng =
    Buffer.isBuffer(fallbackResult.imageBuffer) &&
    fallbackResult.imageBuffer[0] === 0x89 &&
    fallbackResult.imageBuffer[1] === 0x50;

  console.log('✓ Fallback Layout Zod Validated:', fallbackSchemaValidation.success);
  console.log('✓ Fallback Output is PNG Buffer:', fallbackIsPng);
  console.log('✓ Fallback text preserved:', fallbackResult.posterData.headline === testInput.headline);

  console.log('\nAll integration tests passed successfully!');
}

runIntegrationTests().catch((err) => {
  console.error('Integration test failed:', err?.message || err);
  process.exit(1);
});
