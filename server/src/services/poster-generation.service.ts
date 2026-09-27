import mongoose, { Types } from 'mongoose';
import { Template } from '../models/template.model.js';
import { Poster, IPosterDocument } from '../models/poster.model.js';
import {
  generateGeminiLayoutSuggestion,
  GeminiLayoutInput,
  GeminiLayoutSuggestion,
  getFallbackLayout,
} from './gemini-layout.service.js';
import { renderPosterToBuffer, PosterData } from './poster-render.service.js';
import { uploadToCloudinary } from './cloudinary.service.js';

export interface CreatePosterInput {
  userId: string | Types.ObjectId;
  templateId: string | Types.ObjectId;
  occasion: string;
  headline: string;
  name: string;
  designation: string;
  party: string;
  location: string;
  photoUrl?: string;
}

export interface CreatePosterResult {
  posterId: string;
  generatedImageUrl: string;
  generatedImagePublicId: string;
  templateId: string;
  layout: GeminiLayoutSuggestion;
  poster: IPosterDocument;
}

/**
 * Orchestrates full poster generation workflow:
 * 1. Loads Template from MongoDB using templateId.
 * 2. Requests validated Gemini layout suggestion (or safe fallback).
 * 3. Renders HTML poster to PNG Buffer via Puppeteer.
 * 4. Uploads PNG Buffer to Cloudinary under folder 'ai-political-posters/generated'.
 * 5. Saves completed Poster document to MongoDB.
 */
export const createPoster = async (
  input: CreatePosterInput
): Promise<CreatePosterResult> => {
  // 1. Load requested Template from DB (must be active)
  const template = await Template.findOne({
    _id: input.templateId,
    isActive: true,
  });
  if (!template) {
    throw new Error(`Template not found with ID: ${input.templateId}`);
  }

  // 2. Call Gemini layout service
  const geminiInput: GeminiLayoutInput = {
    occasion: input.occasion,
    headline: input.headline,
    name: input.name,
    designation: input.designation,
    party: input.party,
    location: input.location,
    layoutConfig: template.layoutConfig,
  };

  let layoutSuggestion: GeminiLayoutSuggestion;
  try {
    layoutSuggestion = await generateGeminiLayoutSuggestion(geminiInput);
  } catch (error) {
    console.warn(
      '[PosterGenerationService] Gemini layout generation failed, using safe fallback:',
      error
    );
    layoutSuggestion = getFallbackLayout(input.occasion, template.layoutConfig);
  }

  // 3. Render poster to PNG buffer using Puppeteer (preserving user text exactly)
  const posterData: PosterData = {
    occasion: input.occasion,
    headline: input.headline,
    name: input.name,
    designation: input.designation,
    party: input.party,
    location: input.location,
    photoUrl: input.photoUrl,
    layoutConfig: {
      ...(template.layoutConfig || {}),
      ...layoutSuggestion,
    },
  };

  const pngBuffer = await renderPosterToBuffer(posterData);

  // 4. Upload generated PNG buffer to Cloudinary
  const uploadResult = await uploadToCloudinary(
    pngBuffer,
    'ai-political-posters/generated'
  );

  // 5. Save completed poster document to MongoDB
  const poster = await Poster.create({
    userId: new Types.ObjectId(input.userId),
    templateId: new Types.ObjectId(input.templateId),
    occasion: input.occasion,
    headline: input.headline,
    name: input.name,
    designation: input.designation,
    party: input.party,
    location: input.location,
    originalImageUrl: input.photoUrl,
    generatedImageUrl: uploadResult.secureUrl,
    generatedImagePublicId: uploadResult.publicId,
    layout: layoutSuggestion,
  });

  return {
    posterId: poster._id.toString(),
    generatedImageUrl: poster.generatedImageUrl,
    generatedImagePublicId: poster.generatedImagePublicId,
    templateId: poster.templateId.toString(),
    layout: poster.layout as GeminiLayoutSuggestion,
    poster,
  };
};
