import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Template } from '../models/template.model.js';

export const getTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { occasion } = req.query;

    const query: Record<string, any> = { isActive: true };

    if (occasion && typeof occasion === 'string' && occasion.trim() !== '') {
      query.occasion = occasion.trim();
    }

    const templates = await Template.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: templates.length,
      templates,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch templates',
    });
  }
};

export const getTemplateById = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid template ID format',
      });
      return;
    }

    const template = await Template.findOne({ _id: id, isActive: true });

    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Template not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      template,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch template',
    });
  }
};
