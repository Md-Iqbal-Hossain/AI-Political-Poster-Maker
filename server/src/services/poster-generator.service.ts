import {
  generateGeminiLayoutSuggestion,
  GeminiLayoutInput,
  GeminiLayoutSuggestion,
  getFallbackLayout,
} from './gemini-layout.service.js';
import { renderPosterToBuffer, PosterData } from './poster-render.service.js';

export interface GeneratePosterInput {
  occasion?: string;
  headline?: string;
  name?: string;
  designation?: string;
  party?: string;
  location?: string;
  photoUrl?: string;
  layoutConfig?: Record<string, any>;
}

export interface GeneratePosterResult {
  imageBuffer: Buffer;
  layoutSuggestion: GeminiLayoutSuggestion;
  isFallback: boolean;
  posterData: PosterData;
}

/**
 * Service-level integration function connecting Gemini AI layout generation with Puppeteer poster renderer.
 * 
 * Pipeline:
 * 1. Receives poster input data and template layoutConfig.
 * 2. Requests validated Gemini layout suggestion (or safe template fallback).
 * 3. Combines layout properties with exact, untouched user Bangla content.
 * 4. Invokes Puppeteer renderer to produce the final PNG image Buffer.
 */
export const generatePosterWithGeminiLayout = async (
  input: GeneratePosterInput
): Promise<GeneratePosterResult> => {
  const geminiInput: GeminiLayoutInput = {
    occasion: input.occasion,
    headline: input.headline,
    name: input.name,
    designation: input.designation,
    party: input.party,
    location: input.location,
    layoutConfig: input.layoutConfig,
  };

  let isFallback = false;
  let layoutSuggestion: GeminiLayoutSuggestion;

  try {
    layoutSuggestion = await generateGeminiLayoutSuggestion(geminiInput);
    if (layoutSuggestion.designNotes?.includes('Fallback layout')) {
      isFallback = true;
    }
  } catch (error) {
    console.warn('[PosterGeneratorService] Gemini layout error, using safe template fallback:', error);
    layoutSuggestion = getFallbackLayout(input.occasion, input.layoutConfig);
    isFallback = true;
  }

  // Preserve user content exactly without any text modification or translation
  const posterData: PosterData = {
    occasion: input.occasion,
    headline: input.headline,
    name: input.name,
    designation: input.designation,
    party: input.party,
    location: input.location,
    photoUrl: input.photoUrl,
    layoutConfig: {
      ...(input.layoutConfig || {}),
      ...layoutSuggestion,
    },
  };

  const imageBuffer = await renderPosterToBuffer(posterData);

  return {
    imageBuffer,
    layoutSuggestion,
    isFallback,
    posterData,
  };
};
