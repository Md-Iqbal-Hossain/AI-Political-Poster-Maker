import {
  generateGeminiLayoutSuggestion,
  getFallbackLayout,
  GeminiLayoutSuggestionSchema,
  GeminiLayoutInput,
} from '../services/gemini-layout.service.js';

async function runTests() {
  console.log('--- TEST 0: Available Gemini Models ---');
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await res.json() as any;
    if (data.models) {
      console.log('Available models:', data.models.map((m: any) => m.name.replace('models/', '')));
    } else {
      console.log('Models response:', data);
    }
  } catch (e: any) {
    console.log('Model list error:', e?.message);
  }

  console.log('\n--- TEST 1: Fallback Layout Test ---');
  const sampleLayoutConfig = {
    headlinePlacement: { color: '#006A4E' },
    footerPlacement: { backgroundColor: '#004D40' },
  };

  const fallbackResult = getFallbackLayout('victory-day', sampleLayoutConfig);
  console.log('Fallback Result:', JSON.stringify(fallbackResult, null, 2));

  const fallbackParsed = GeminiLayoutSuggestionSchema.safeParse(fallbackResult);
  console.log('Fallback Zod Validation Passed:', fallbackParsed.success);

  console.log('\n--- TEST 2: Real Gemini API Test ---');
  const testInput: GeminiLayoutInput = {
    occasion: 'বিজয় দিবস',
    headline: 'সবাইকে মহান বিজয় দিবসের শুভেচ্ছা ও অভিনন্দন',
    name: 'মোঃ জহিরুল ইসলাম',
    designation: 'সাধারণ সম্পাদক, বাংলাদেশ ছাত্র ফ্রন্ট',
    party: 'বাংলাদেশ ছাত্র ফ্রন্ট',
    location: 'ঢাকা উত্তর শাখা',
    layoutConfig: sampleLayoutConfig,
  };

  const apiResult = await generateGeminiLayoutSuggestion(testInput);
  console.log('Gemini API Result:', JSON.stringify(apiResult, null, 2));

  const apiParsed = GeminiLayoutSuggestionSchema.safeParse(apiResult);
  console.log('API Result Zod Validation Passed:', apiParsed.success);

  if (!apiParsed.success) {
    console.error('Validation Error Details:', apiParsed.error.format());
  }

  console.log('\n--- TEST 3: Invalid API Key / Error Fallback Test ---');
  // Temporarily clear key in memory to test fallback handling
  const originalEnvKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'invalid_key_for_test';

  const errorFallbackResult = getFallbackLayout('eid');
  const errorFallbackParsed = GeminiLayoutSuggestionSchema.safeParse(errorFallbackResult);
  console.log('Error Fallback Result Zod Validation Passed:', errorFallbackParsed.success);

  // Restore env key
  process.env.GEMINI_API_KEY = originalEnvKey;
}

runTests().catch((err) => {
  console.error('Test execution error:', err?.message || err);
});
