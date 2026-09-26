import mongoose, { Schema, Document } from 'mongoose';

export interface ITemplate {
  name: string;
  occasion: string;
  description?: string;
  previewUrl?: string;
  layoutConfig?: Record<string, any>;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITemplateDocument extends ITemplate, Document {}

const TemplateSchema: Schema = new Schema<ITemplateDocument>(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
    },
    occasion: {
      type: String,
      required: [true, 'Occasion is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    previewUrl: {
      type: String,
      trim: true,
    },
    layoutConfig: {
      type: Schema.Types.Mixed,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Template = mongoose.model<ITemplateDocument>('Template', TemplateSchema);
