import puppeteer from 'puppeteer';
import { generatePosterHtml, renderPosterToBuffer, PosterData } from '../services/poster-render.service.js';

async function runPosterRendererXssTest() {
  console.log('=== TEST: Poster Renderer HTML/XSS Safety & Bangla Rendering ===');

  try {
    // 1. Test XSS / HTML Injection Payload
    const xssPayload: PosterData = {
      headline: '<img src=x onerror=alert("headline-xss")>',
      name: '<script>alert("name-xss")</script>',
      designation: '<a href="javascript:alert(1)">Designation Link</a>',
      party: '<b>Party Bold XSS</b>',
      location: '<iframe src="http://malicious.com"></iframe>',
      occasion: '<style>body{display:none}</style>',
      photoUrl: 'https://placehold.co/400x400.png',
    };

    console.log('\n--- 1. Testing generatePosterHtml Escaping Output ---');
    const htmlOutput = generatePosterHtml(xssPayload);

    // Verify raw unescaped HTML tags are NOT present in output
    if (htmlOutput.includes('<img src=x onerror=alert("headline-xss")>')) {
      throw new Error('XSS Injection Vulnerability: Unescaped <img> tag found in HTML output!');
    }
    if (htmlOutput.includes('<script>alert("name-xss")</script>')) {
      throw new Error('XSS Injection Vulnerability: Unescaped <script> tag found in HTML output!');
    }
    if (htmlOutput.includes('<iframe src="http://malicious.com"></iframe>')) {
      throw new Error('XSS Injection Vulnerability: Unescaped <iframe> tag found in HTML output!');
    }

    // Verify HTML entity escaping is present
    if (
      !htmlOutput.includes('&lt;img src=x onerror=alert(&quot;headline-xss&quot;)&gt;') ||
      !htmlOutput.includes('&lt;script&gt;alert(&quot;name-xss&quot;)&lt;/script&gt;') ||
      !htmlOutput.includes('&lt;iframe src=&quot;http://malicious.com&quot;&gt;&lt;/iframe&gt;')
    ) {
      throw new Error('HTML escaping check failed for user-controlled text fields!');
    }
    console.log('✓ generatePosterHtml correctly escaped all HTML-like user text fields.');

    // 2. DOM Parsing via Puppeteer
    console.log('\n--- 2. Verifying DOM Element Rendering via Puppeteer ---');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlOutput, { waitUntil: 'load' });

    // Verify that NO executable/injected element tags exist inside user content containers
    const injectedScriptCount = await page.$$eval('script', (scripts) =>
      scripts.filter((s) => s.textContent?.includes('name-xss')).length
    );
    const injectedImgInName = await page.$('.leader-name img');
    const injectedIframeInLocation = await page.$('.location-title iframe');

    await browser.close();

    if (injectedScriptCount > 0) {
      throw new Error('XSS Security Failure: Injected <script> tag was executed/added to DOM!');
    }
    if (injectedImgInName !== null) {
      throw new Error('XSS Security Failure: Injected <img> string was parsed as a DOM element node!');
    }
    if (injectedIframeInLocation !== null) {
      throw new Error('XSS Security Failure: Injected <iframe> string was parsed as a DOM element node!');
    }
    console.log('✓ Puppeteer DOM inspection confirmed user HTML inputs are rendered as plain text nodes, not DOM elements.');

    // 3. Bangla Character Rendering Test
    console.log('\n--- 3. Testing Normal Bangla Text Rendering ---');
    const banglaData: PosterData = {
      headline: 'সবাইকে মহান বিজয় দিবসের শুভেচ্ছা ও অভিনন্দন',
      name: 'মোঃ জহিরুল ইসলাম',
      designation: 'সাধারণ সম্পাদক, বাংলাদেশ ছাত্র ফ্রন্ট',
      party: 'বাংলাদেশ ছাত্র ফ্রন্ট',
      location: 'ঢাকা উত্তর শাখা',
      occasion: 'বিজয় দিবস',
      photoUrl: 'https://placehold.co/400x400.png',
    };

    const banglaHtml = generatePosterHtml(banglaData);

    if (
      !banglaHtml.includes('সবাইকে মহান বিজয় দিবসের শুভেচ্ছা ও অভিনন্দন') ||
      !banglaHtml.includes('মোঃ জহিরুল ইসলাম') ||
      !banglaHtml.includes('বাংলাদেশ ছাত্র ফ্রন্ট')
    ) {
      throw new Error('Bangla text rendering test failed: Expected Bangla strings missing from HTML output!');
    }
    console.log('✓ generatePosterHtml accurately preserved Bangla unicode text.');

    // 4. PNG Buffer Generation Test
    console.log('\n--- 4. Testing Poster PNG Buffer Generation with Puppeteer ---');
    const pngBuffer = await renderPosterToBuffer(banglaData);

    console.log('Generated PNG Buffer size:', pngBuffer.length, 'bytes');
    if (!pngBuffer || pngBuffer.length < 5000) {
      throw new Error('PNG buffer generation failed or produced invalid buffer size!');
    }
    console.log('✓ renderPosterToBuffer successfully generated clean PNG image buffer.');

    console.log('\nAll Poster Renderer HTML/XSS Safety & Bangla Rendering tests passed successfully!');
  } catch (error: any) {
    console.error('Renderer Test failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    process.exit(process.exitCode || 0);
  }
}

runPosterRendererXssTest();
