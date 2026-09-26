import puppeteer, { Browser } from 'puppeteer';

export interface PosterData {
  headline?: string;
  name?: string;
  designation?: string;
  party?: string;
  location?: string;
  occasion?: string;
  photoUrl?: string;
  layoutConfig?: Record<string, any>;
}

const escapeHtml = (text: string = ''): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const generatePosterHtml = (
  data: PosterData,
  width: number = 1200,
  height: number = 1600
): string => {
  const headline = data.headline || 'সবাইকে বিজয় দিবসের শুভেচ্ছা';
  const name = data.name || 'মোঃ জহিরুল ইসলাম';
  const designation = data.designation || 'সাধারণ সম্পাদক, বাংলাদেশ ছাত্র ফ্রন্ট';
  const party = data.party || 'বাংলাদেশ ছাত্র ফ্রন্ট';
  const location = data.location || 'ঢাকা উত্তর শাখা';
  const occasion = data.occasion || 'বিজয় দিবস';
  const photoUrl = data.photoUrl || '';

  const layoutConfig = data.layoutConfig || {};

  // 1. backgroundColor property
  const backgroundColor = layoutConfig.backgroundColor || '#004D40';

  // 2. accentColor property
  const accentColor = layoutConfig.accentColor || '#FFD700';

  // 3. photoPlacement property
  const photoPlacement = layoutConfig.photoPlacement || 'center-circle';
  let photoWidth = '650px';
  let photoHeight = '650px';
  let photoMargin = '30px auto';
  let photoBorderRadius = '50%';

  if (photoPlacement === 'top-circle') {
    photoWidth = '550px';
    photoHeight = '550px';
    photoMargin = '15px auto';
  } else if (photoPlacement === 'center-rounded') {
    photoBorderRadius = '24px';
  } else if (photoPlacement === 'left-side') {
    photoWidth = '580px';
    photoHeight = '580px';
    photoMargin = '20px auto 20px 80px';
  } else if (photoPlacement === 'right-side') {
    photoWidth = '580px';
    photoHeight = '580px';
    photoMargin = '20px 80px 20px auto';
  }

  // 4. headlinePlacement property
  const headlinePlacement = layoutConfig.headlinePlacement || 'below-photo';

  // 5. decorativeStyle property
  const decorativeStyle = layoutConfig.decorativeStyle || 'patriotic-flag';
  let badgeBg = '#D32F2F';
  let footerBg = 'linear-gradient(90deg, #D32F2F 0%, #B71C1C 100%)';

  if (decorativeStyle === 'festive-crescent') {
    badgeBg = '#D4AC0D';
    footerBg = 'linear-gradient(90deg, #0B5345 0%, #145A32 100%)';
  } else if (decorativeStyle === 'solemn-minimal') {
    badgeBg = '#566573';
    footerBg = 'linear-gradient(90deg, #1C2833 0%, #2C3E50 100%)';
  } else if (decorativeStyle === 'modern-gradient') {
    badgeBg = '#3182CE';
    footerBg = 'linear-gradient(90deg, #2B6CB0 0%, #1A365D 100%)';
  } else if (decorativeStyle === 'classic-framed') {
    badgeBg = '#805AD5';
    footerBg = 'linear-gradient(90deg, #6B46C1 0%, #4A5568 100%)';
  }

  const headlineHtml = headline
    ? `<div class="headline ${headlinePlacement}">${escapeHtml(headline)}</div>`
    : '';

  const renderTopHeadline = headlinePlacement === 'top-banner' ? headlineHtml : '';
  const renderContentHeadline = headlinePlacement !== 'top-banner' ? headlineHtml : '';

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${width}, height=${height}">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700;800&family=Hind+Siliguri:wght@400;600;700&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: ${width}px;
      height: ${height}px;
      font-family: 'Noto Sans Bengali', 'Hind Siliguri', sans-serif;
      background: ${backgroundColor};
      color: #FFFFFF;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }

    /* Top Banner Header */
    .header {
      width: 100%;
      padding: 30px 60px 20px 60px;
      text-align: center;
      background: rgba(0, 0, 0, 0.25);
      border-bottom: 4px solid ${accentColor};
    }

    .occasion-badge {
      display: inline-block;
      background: ${badgeBg};
      color: #FFFFFF;
      padding: 12px 36px;
      border-radius: 50px;
      font-size: 30px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }

    .party-title {
      font-size: 34px;
      color: ${accentColor};
      font-weight: 700;
      margin-top: 8px;
    }

    .location-title {
      font-size: 26px;
      color: #E0F2F1;
      opacity: 0.95;
    }

    /* Central Photo Container */
    .photo-section {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: ${photoMargin};
      width: ${photoWidth};
      height: ${photoHeight};
      position: relative;
    }

    .photo-frame {
      width: 100%;
      height: 100%;
      border-radius: ${photoBorderRadius};
      border: 12px solid ${accentColor};
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      background-color: rgba(0,0,0,0.2);
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .photo-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .placeholder-avatar {
      font-size: 160px;
      color: #4DB6AC;
    }

    /* Content Area */
    .content-section {
      text-align: center;
      padding: 0 60px;
      margin-bottom: 20px;
    }

    .headline {
      font-size: 50px;
      font-weight: 800;
      line-height: 1.35;
      color: #FFFFFF;
      text-shadow: 2px 4px 10px rgba(0, 0, 0, 0.6);
      margin-bottom: 20px;
    }

    .headline.top-banner {
      font-size: 42px;
      margin-top: 15px;
      margin-bottom: 5px;
      color: #FFFFFF;
    }

    .headline.centered {
      display: inline-block;
      padding: 12px 30px;
      background: rgba(0, 0, 0, 0.35);
      border-radius: 16px;
      border: 2px solid ${accentColor};
    }

    .headline.overlay-bottom {
      font-size: 44px;
      background: rgba(0, 0, 0, 0.45);
      padding: 10px 20px;
      border-radius: 12px;
    }

    .leader-name {
      font-size: 48px;
      font-weight: 800;
      color: ${accentColor};
      margin-bottom: 10px;
      text-shadow: 1px 2px 6px rgba(0,0,0,0.5);
    }

    .leader-designation {
      font-size: 32px;
      color: #E0F2F1;
      font-weight: 600;
    }

    /* Footer Section */
    .footer {
      width: 100%;
      background: ${footerBg};
      padding: 30px 40px;
      text-align: center;
      font-size: 28px;
      font-weight: 700;
      color: #FFFFFF;
      border-top: 4px solid ${accentColor};
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="header">
    ${occasion ? `<div class="occasion-badge">${escapeHtml(occasion)}</div>` : ''}
    ${party ? `<div class="party-title">${escapeHtml(party)}</div>` : ''}
    ${location ? `<div class="location-title">${escapeHtml(location)}</div>` : ''}
    ${renderTopHeadline}
  </div>

  <div class="photo-section">
    <div class="photo-frame">
      ${photoUrl ? `<img src="${escapeHtml(photoUrl)}" alt="Leader Photo" />` : '<div class="placeholder-avatar">👤</div>'}
    </div>
  </div>

  <div class="content-section">
    ${renderContentHeadline}
    ${name ? `<div class="leader-name">${escapeHtml(name)}</div>` : ''}
    ${designation ? `<div class="leader-designation">${escapeHtml(designation)}</div>` : ''}
  </div>

  <div class="footer">
    সৌজন্যে: প্রচার ও প্রকাশনা কমিটি | সর্বস্তরের জনগণকে শুভেচ্ছা
  </div>
</body>
</html>`;
};

export const renderPosterToBuffer = async (data: PosterData): Promise<Buffer> => {
  let browser: Browser | null = null;
  try {
    const width = data.layoutConfig?.canvas?.width || 1200;
    const height = data.layoutConfig?.canvas?.height || 1600;

    const htmlContent = generatePosterHtml(data, width, height);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--font-render-hinting=none',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 1,
    });

    await page.setContent(htmlContent, {
      waitUntil: ['load', 'networkidle0'] as any,
      timeout: 30000,
    });

    const imageBuffer = (await page.screenshot({
      type: 'png',
      fullPage: false,
      clip: { x: 0, y: 0, width, height },
    })) as Buffer;

    return Buffer.from(imageBuffer);
  } catch (error: any) {
    console.error('[PosterRenderService] Render error:', error?.message || error);
    throw new Error(`Poster rendering error: ${error?.message || 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
