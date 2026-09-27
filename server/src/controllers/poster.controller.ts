import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Poster } from '../models/poster.model.js';
import { createPoster } from '../services/poster-generation.service.js';

export const generatePosterSchema = z.object({
  templateId: z
    .string({ required_error: 'Template ID is required' })
    .trim()
    .min(1, 'Template ID is required')
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: 'Invalid template ID format',
    }),
  occasion: z
    .string({ required_error: 'Occasion is required' })
    .trim()
    .min(1, 'Occasion is required')
    .max(100, 'Occasion must be 100 characters or less'),
  headline: z
    .string({ required_error: 'Headline is required' })
    .trim()
    .min(1, 'Headline is required')
    .max(200, 'Headline must be 200 characters or less'),
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  designation: z
    .string({ required_error: 'Designation is required' })
    .trim()
    .min(1, 'Designation is required')
    .max(150, 'Designation must be 150 characters or less'),
  party: z
    .string({ required_error: 'Party is required' })
    .trim()
    .min(1, 'Party is required')
    .max(100, 'Party must be 100 characters or less'),
  location: z
    .string({ required_error: 'Location is required' })
    .trim()
    .min(1, 'Location is required')
    .max(100, 'Location must be 100 characters or less'),
  photoUrl: z
    .string()
    .trim()
    .url('Invalid photo URL format')
    .refine(
      (val) => val.startsWith('http://') || val.startsWith('https://'),
      { message: 'Photo URL must use http or https protocol' }
    )
    .optional()
    .or(z.literal('')),
});

export const getPostersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 1))
    .refine((val) => Number.isInteger(val) && val >= 1, {
      message: 'Page must be an integer greater than or equal to 1',
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 10))
    .refine((val) => Number.isInteger(val) && val >= 1 && val <= 50, {
      message: 'Limit must be an integer between 1 and 50',
    }),
});

export const generatePosterController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing user authentication',
      });
      return;
    }

    const parseResult = generatePosterSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const {
      templateId,
      occasion,
      headline,
      name,
      designation,
      party,
      location,
      photoUrl,
    } = parseResult.data;

    const result = await createPoster({
      userId,
      templateId,
      occasion,
      headline,
      name,
      designation,
      party,
      location,
      photoUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Poster generated successfully',
      data: {
        posterId: result.posterId,
        generatedImageUrl: result.generatedImageUrl,
        generatedImagePublicId: result.generatedImagePublicId,
        templateId: result.templateId,
        layout: result.layout,
      },
    });
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to generate poster';

    if (errorMessage.toLowerCase().includes('template not found')) {
      res.status(404).json({
        success: false,
        message: errorMessage,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

export const getUserPostersController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing user authentication',
      });
      return;
    }

    const parseResult = getPostersQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const page = parseResult.data.page;
    const limit = parseResult.data.limit;
    const skip = (page - 1) * limit;

    const query = { userId: new mongoose.Types.ObjectId(userId) };

    const [total, posters] = await Promise.all([
      Poster.countDocuments(query),
      Poster.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

    res.status(200).json({
      success: true,
      data: posters,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch user poster history',
    });
  }
};

export const regeneratePosterController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing user authentication',
      });
      return;
    }

    const rawPosterId = req.params.id;
    const posterId = Array.isArray(rawPosterId) ? rawPosterId[0] : rawPosterId;

    if (!posterId || typeof posterId !== 'string' || !mongoose.Types.ObjectId.isValid(posterId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid poster ID format',
      });
      return;
    }

    // Find existing poster belonging strictly to authenticated user
    const existingPoster = await Poster.findOne({
      _id: new mongoose.Types.ObjectId(posterId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!existingPoster) {
      res.status(404).json({
        success: false,
        message: 'Poster not found',
      });
      return;
    }

    // Re-use original content & call createPoster to generate a NEW poster document
    const result = await createPoster({
      userId,
      templateId: existingPoster.templateId.toString(),
      occasion: existingPoster.occasion,
      headline: existingPoster.headline,
      name: existingPoster.name,
      designation: existingPoster.designation,
      party: existingPoster.party,
      location: existingPoster.location,
      photoUrl: existingPoster.originalImageUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Poster regenerated successfully',
      data: {
        posterId: result.posterId,
        generatedImageUrl: result.generatedImageUrl,
        generatedImagePublicId: result.generatedImagePublicId,
        templateId: result.templateId,
        layout: result.layout,
      },
    });
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to regenerate poster';

    if (errorMessage.toLowerCase().includes('template not found')) {
      res.status(404).json({
        success: false,
        message: errorMessage,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};
