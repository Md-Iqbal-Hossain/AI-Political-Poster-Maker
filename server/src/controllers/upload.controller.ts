import { Request, Response } from 'express';
import { uploadToCloudinary } from '../services/cloudinary.service.js';

export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No image file provided. Please attach an image file with field name "image".',
      });
      return;
    }

    const { secureUrl, publicId } = await uploadToCloudinary(req.file.buffer);

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      secureUrl,
      publicId,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to upload image to Cloudinary',
    });
  }
};
