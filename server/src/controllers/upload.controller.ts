import { Request, Response } from 'express';
import { uploadToCloudinary } from '../services/cloudinary.service.js';

export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    let filesList: Express.Multer.File[] = [];

    if (req.files) {
      if (Array.isArray(req.files)) {
        filesList = req.files;
      } else if (typeof req.files === 'object') {
        const fieldsObj = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (fieldsObj.images && Array.isArray(fieldsObj.images)) {
          filesList.push(...fieldsObj.images);
        }
        if (fieldsObj.image && Array.isArray(fieldsObj.image)) {
          filesList.push(...fieldsObj.image);
        }
      }
    } else if (req.file) {
      filesList.push(req.file);
    }

    if (filesList.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No image file provided. Please attach at least one image file with field name "images".',
      });
      return;
    }

    if (filesList.length > 3) {
      res.status(400).json({
        success: false,
        message: 'Maximum 3 image files allowed.',
      });
      return;
    }

    const uploadedImages = await Promise.all(
      filesList.map(async (file) => {
        const { secureUrl, publicId } = await uploadToCloudinary(file.buffer);
        return { secureUrl, publicId };
      })
    );

    res.status(200).json({
      success: true,
      message: filesList.length === 1 ? 'Image uploaded successfully' : 'Images uploaded successfully',
      images: uploadedImages,
      secureUrl: uploadedImages[0].secureUrl,
      publicId: uploadedImages[0].publicId,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to upload image to Cloudinary',
    });
  }
};
