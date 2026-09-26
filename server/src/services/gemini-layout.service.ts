import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { ENV } from '../config/env.js';

// Predefined strict allowlists for layout choices
export const PHOTO_PLACEMENTS = [
  'center-circle',
  'top-circle',
  'center-rounded',
  'left-side',
  'right-side',
] as const;

export const HEADLINE_PLACEMENTS = [
  'top-banner',
  'below-photo',
  'overlay-bottom',
  'centered',
] as const;

export const DECORATIVE_STYLES = [
  'patriotic-flag',
  'festive-crescent',
  'solemn-minimal',
  'modern-gradient',
  'classic-framed',
] as const;

export type PhotoPlacement = (typeof PHOTO_PLACEMENTS)[number];
export type HeadlinePlacement = (typeof HEADLINE_PLACEMENTS)[number];
export type DecorativeStyle = (typeof DECORATIVE_STYLES)[number];

// Strict regex for 6-digit or 3-digit HEX colors (#RRGGBB or #RGB)
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

// Helper to strip HTML tags from design notes to avoid raw injection
const sanitizeString = (val: string): string => {
  return val.replace(/<[^>]*>?/gm, '').trim();
};

// Zod Schema for strict validation of Gemini output
export const GeminiLayoutSuggestionSchema = z.object({
  backgroundColor: z
    .string()
    .trim()
    .regex(HEX_COLOR_REGEX, 'Must be a valid hex color format (e.g. #004D40)'),
  accentColor: z
    .string()
    .trim()
    .regex(HEX_COLOR_REGEX, 'Must be a valid hex color format (e.g. #FFD700)'),
  photoPlacement: z.enum(PHOTO_PLACEMENTS),
  headlinePlacement: z.enum(HEADLINE_PLACEMENTS),
  decorativeStyle: z.enum(DECORATIVE_STYLES),
  designNotes: z
    .string()
    .transform(sanitizeString)
    .pipe(z.string().max(200))
    .optional()
    .default(''),
});

export type GeminiLayoutSuggestion = z.infer<typeof GeminiLayoutSuggestionSchema>;

export interface GeminiLayoutInput {
  occasion?: string;
  headline?: string; // Bangla headline
  name?: string;
  designation?: string;
  party?: string;
  location?: string;
  layoutConfig?: Record<string, any>;
}

/**
 * Provides a safe fallback layout based on occasion or template default layoutConfig.
 */
export const getFallbackLayout = (
  occasion?: string,
  existingLayoutConfig?: Record<string, any>
): GeminiLayoutSuggestion => {
  const occasionLower = (occasion || '').toLowerCase();

  let backgroundColor = '#004D40';
  let accentColor = '#FFD700';
  let photoPlacement: PhotoPlacement = 'center-circle';
  let headlinePlacement: HeadlinePlacement = 'below-photo';
  let decorativeStyle: DecorativeStyle = 'patriotic-flag';

  if (
    occasionLower.includes('eid') ||
    occasionLower.includes('ঈদ') ||
    occasionLower.includes('ঈদুল')
  ) {
    backgroundColor = '#0B5345';
    accentColor = '#D4AC0D';
    photoPlacement = 'center-circle';
    headlinePlacement = 'below-photo';
    decorativeStyle = 'festive-crescent';
  } else if (
    occasionLower.includes('condolence') ||
    occasionLower.includes('שוק') ||
    occasionLower.includes('শোক') ||
    occasionLower.includes('স্মরণ')
  ) {
    backgroundColor = '#1C2833';
    accentColor = '#566573';
    photoPlacement = 'center-rounded';
    headlinePlacement = 'below-photo';
    decorativeStyle = 'solemn-minimal';
  } else if (
    occasionLower.includes('election') ||
    occasionLower.includes('নির্বাচন') ||
    occasionLower.includes('প্রচার')
  ) {
    backgroundColor = '#1A365D';
    accentColor = '#3182CE';
    photoPlacement = 'top-circle';
    headlinePlacement = 'top-banner';
    decorativeStyle = 'classic-framed';
  }

  // Override colors from existing layoutConfig if valid hex colors exist
  if (existingLayoutConfig) {
    if (
      typeof existingLayoutConfig.footerPlacement?.backgroundColor === 'string' &&
      HEX_COLOR_REGEX.test(existingLayoutConfig.footerPlacement.backgroundColor)
    ) {
      backgroundColor = existingLayoutConfig.footerPlacement.backgroundColor;
    }
    if (
      typeof existingLayoutConfig.headlinePlacement?.color === 'string' &&
      HEX_COLOR_REGEX.test(existingLayoutConfig.headlinePlacement.color)
    ) {
      accentColor = existingLayoutConfig.headlinePlacement.color;
    }
  }

  return {
    backgroundColor,
    accentColor,
    photoPlacement,
    headlinePlacement,
    decorativeStyle,
    designNotes: 'Fallback layout selected based on predefined template defaults.',
  };
};

/**
 * Calls Gemini AI to suggest structured layout visual properties using current @google/genai SDK.
 * Uses strict Zod validation and safe fallback on any API error or invalid response.
 */
export const generateGeminiLayoutSuggestion = async (
  input: GeminiLayoutInput
): Promise<GeminiLayoutSuggestion> => {
  const apiKey = ENV.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('placeholder')) {
    console.warn(
      '[GeminiLayoutService] GEMINI_API_KEY is not configured or is a placeholder. Returning fallback layout.'
    );
    return getFallbackLayout(input.occasion, input.layoutConfig);
  }

  const prompt = `You are an expert visual design assistant for political and event posters.
Your task is to suggest ONLY visual design and layout properties based on the poster context below:
- Occasion: "${input.occasion || 'General Event'}"
- Bangla Headline: "${input.headline || ''}"
- Person Name: "${input.name || ''}"
- Designation: "${input.designation || ''}"
- Party/Organization: "${input.party || ''}"
- Location: "${input.location || ''}"

STRICT RULES:
1. Suggest ONLY visual layout options matching these strict choices:
   - photoPlacement: MUST be one of ["center-circle", "top-circle", "center-rounded", "left-side", "right-side"]
   - headlinePlacement: MUST be one of ["top-banner", "below-photo", "overlay-bottom", "centered"]
   - decorativeStyle: MUST be one of ["patriotic-flag", "festive-crescent", "solemn-minimal", "modern-gradient", "classic-framed"]
   - backgroundColor: MUST be a valid 6-digit hex color string starting with # (e.g., "#004D40")
   - accentColor: MUST be a valid 6-digit hex color string starting with # (e.g., "#FFD700")
   - designNotes: short visual design rationale (max 150 chars).

2. DO NOT rewrite, translate, summarize, or alter any text content for the person's name, designation, party name, location, or headline.
3. Return ONLY a valid raw JSON object matching the requested schema. No markdown backticks, no markdown formatting.`;

  const modelsToTry = [
    process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
  ];

  const ai = new GoogleGenAI({ apiKey });

  for (const modelName of modelsToTry) {
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                backgroundColor: {
                  type: Type.STRING,
                  description: 'Hex color string for background (e.g. #004D40)',
                },
                accentColor: {
                  type: Type.STRING,
                  description: 'Hex color string for accent (e.g. #FFD700)',
                },
                photoPlacement: {
                  type: Type.STRING,
                  description:
                    'One of: center-circle, top-circle, center-rounded, left-side, right-side',
                  enum: PHOTO_PLACEMENTS as unknown as string[],
                },
                headlinePlacement: {
                  type: Type.STRING,
                  description:
                    'One of: top-banner, below-photo, overlay-bottom, centered',
                  enum: HEADLINE_PLACEMENTS as unknown as string[],
                },
                decorativeStyle: {
                  type: Type.STRING,
                  description:
                    'One of: patriotic-flag, festive-crescent, solemn-minimal, modern-gradient, classic-framed',
                  enum: DECORATIVE_STYLES as unknown as string[],
                },
                designNotes: {
                  type: Type.STRING,
                  description: 'Short rationale for visual style (max 150 chars)',
                },
              },
              required: [
                'backgroundColor',
                'accentColor',
                'photoPlacement',
                'headlinePlacement',
                'decorativeStyle',
              ],
            },
          },
        });

        const responseText = response.text;

        if (!responseText) {
          break;
        }

        const cleanedText = responseText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();

        const parsedJson = JSON.parse(cleanedText);
        const validationResult = GeminiLayoutSuggestionSchema.safeParse(parsedJson);

        if (validationResult.success) {
          return validationResult.data;
        } else {
          console.warn(
            `[GeminiLayoutService] Validation failed for model ${modelName}:`,
            validationResult.error.format()
          );
          break;
        }
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        if (errorMsg.includes('503') && attempts < maxAttempts) {
          console.warn(
            `[GeminiLayoutService] Model ${modelName} returned 503 high demand. Retrying in 1.5s (attempt ${attempts}/${maxAttempts})...`
          );
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        console.warn(
          `[GeminiLayoutService] Error with model ${modelName}: ${errorMsg}`
        );
        break;
      }
    }
  }

  console.warn(
    '[GeminiLayoutService] Unable to obtain valid Gemini layout recommendation. Falling back to default template layoutConfig.'
  );
  return getFallbackLayout(input.occasion, input.layoutConfig);
};
