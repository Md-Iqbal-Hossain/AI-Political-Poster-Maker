import { generatePosterHtml, PosterData } from '../services/poster-render.service.js';
import { GeminiLayoutSuggestionSchema } from '../services/gemini-layout.service.js';

async function runPosterCssSecurityTest() {
  console.log('=== TEST: Poster Renderer CSS / Layout Value Security ===');

  try {
    // 1. Test Gemini Zod Schema Validation with Malicious Layout Inputs
    console.log('\n--- 1. Testing Gemini Layout Zod Schema Rejection ---');
    const maliciousGeminiInputs = [
      {
        backgroundColor: 'red; background-image:url(javascript:alert(1))',
        accentColor: '#FFD700',
        photoPlacement: 'center-circle',
        headlinePlacement: 'below-photo',
        decorativeStyle: 'patriotic-flag',
      },
      {
        backgroundColor: '#004D40',
        accentColor: '#fff; color:red; position:absolute',
        photoPlacement: 'center-circle',
        headlinePlacement: 'below-photo',
        decorativeStyle: 'patriotic-flag',
      },
      {
        backgroundColor: '#004D40',
        accentColor: '#FFD700',
        photoPlacement: 'center-circle; font-size:100px',
        headlinePlacement: 'below-photo',
        decorativeStyle: 'patriotic-flag',
      },
      {
        backgroundColor: '#004D40',
        accentColor: '#FFD700',
        photoPlacement: 'center-circle',
        headlinePlacement: '<script>alert(1)</script>',
        decorativeStyle: 'patriotic-flag',
      },
    ];

    for (const item of maliciousGeminiInputs) {
      const result = GeminiLayoutSuggestionSchema.safeParse(item);
      if (result.success) {
        throw new Error(`Gemini Zod Schema failed to reject malicious layout input: ${JSON.stringify(item)}`);
      }
    }
    console.log('✓ GeminiLayoutSuggestionSchema successfully rejected all malicious CSS injection attempts.');

    // 2. Test Renderer Direct Fallback with Malicious Layout Configs
    console.log('\n--- 2. Testing Poster Renderer CSS Fallback Handling ---');

    const maliciousPosterData: PosterData = {
      headline: 'বিজয় দিবসের শুভেচ্ছা',
      name: 'টেস্ট ক্যান্ডিডেট',
      layoutConfig: {
        backgroundColor: 'red; background-image:url(javascript:alert(1))',
        accentColor: '#fff; color:red; position:absolute',
        photoPlacement: 'left-side; font-size:100px',
        headlinePlacement: '<script>alert(1)</script>',
        decorativeStyle: 'patriotic-flag} body{background:red}',
      },
    };

    const renderedHtml = generatePosterHtml(maliciousPosterData);

    // Verify malicious CSS snippets do NOT appear in the rendered HTML
    if (renderedHtml.includes('javascript:alert(1)')) {
      throw new Error('CSS Injection Failure: javascript: payload found in rendered CSS!');
    }
    if (renderedHtml.includes('#fff; color:red')) {
      throw new Error('CSS Injection Failure: Malicious color semicolon injection found in rendered CSS!');
    }
    if (renderedHtml.includes('font-size:100px')) {
      throw new Error('CSS Injection Failure: Injected CSS declaration found in rendered CSS!');
    }
    if (renderedHtml.includes('<script>alert(1)</script>')) {
      throw new Error('CSS Injection Failure: Malicious script tag found in layout class string!');
    }
    if (renderedHtml.includes('body{background:red}')) {
      throw new Error('CSS Injection Failure: Malicious style rule break-out found in CSS!');
    }

    // Verify safe fallback values were inserted instead
    if (!renderedHtml.includes('background: #004D40;')) {
      throw new Error('Fallback check failed: Default background #004D40 was not used!');
    }
    if (!renderedHtml.includes('border-bottom: 4px solid #FFD700;')) {
      throw new Error('Fallback check failed: Default accent #FFD700 was not used!');
    }
    if (!renderedHtml.includes('<div class="headline below-photo">')) {
      throw new Error('Fallback check failed: Default headline placement below-photo was not used!');
    }

    console.log('✓ Poster renderer safely stripped malicious layout strings and applied safe defaults (#004D40, #FFD700, below-photo, center-circle).');

    // 3. Test Valid Layout Choices Render Correctly
    console.log('\n--- 3. Testing Valid Layout Choices Rendering ---');
    const validPosterData: PosterData = {
      headline: 'বিজয় দিবসের শুভেচ্ছা',
      name: 'টেস্ট ক্যান্ডিডেট',
      layoutConfig: {
        backgroundColor: '#006A4E',
        accentColor: '#F42A41',
        photoPlacement: 'top-circle',
        headlinePlacement: 'top-banner',
        decorativeStyle: 'modern-gradient',
      },
    };

    const validHtml = generatePosterHtml(validPosterData);

    if (
      !validHtml.includes('background: #006A4E;') ||
      !validHtml.includes('border-bottom: 4px solid #F42A41;') ||
      !validHtml.includes('width: 550px;') || // top-circle dimensions
      !validHtml.includes('background: #3182CE;') // modern-gradient badgeBg
    ) {
      throw new Error('Valid layout choices test failed: Valid CSS styles were not correctly rendered!');
    }

    console.log('✓ Valid layout configuration rendered accurately with custom colors (#006A4E, #F42A41) and styles (top-circle, modern-gradient).');

    console.log('\nAll Poster Renderer CSS / Layout Value Security tests passed successfully!');
  } catch (error: any) {
    console.error('CSS Security Test failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    process.exit(process.exitCode || 0);
  }
}

runPosterCssSecurityTest();
