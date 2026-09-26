import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPosterLayout {
  backgroundColor: string;
  accentColor: string;
  photoPlacement: string;
  headlinePlacement: string;
  decorativeStyle: string;
  designNotes?: string;
}

export interface IPoster {
  userId: Types.ObjectId;
  templateId: Types.ObjectId;
  occasion: string;
  headline: string;
  name: string;
  designation: string;
  party: string;
  location: string;
  originalImageUrl?: string;
  generatedImageUrl: string;
  generatedImagePublicId: string;
  layout: IPosterLayout;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPosterDocument extends IPoster, Document {}

const PosterLayoutSchema = new Schema<IPosterLayout>(
  {
    backgroundColor: {
      type: String,
      required: [true, 'Background color is required'],
      trim: true,
    },
    accentColor: {
      type: String,
      required: [true, 'Accent color is required'],
      trim: true,
    },
    photoPlacement: {
      type: String,
      required: [true, 'Photo placement is required'],
      trim: true,
    },
    headlinePlacement: {
      type: String,
      required: [true, 'Headline placement is required'],
      trim: true,
    },
    decorativeStyle: {
      type: String,
      required: [true, 'Decorative style is required'],
      trim: true,
    },
    designNotes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const PosterSchema: Schema = new Schema<IPosterDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'Template',
      required: [true, 'Template ID is required'],
    },
    occasion: {
      type: String,
      required: [true, 'Occasion is required'],
      trim: true,
    },
    headline: {
      type: String,
      required: [true, 'Headline is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
    },
    party: {
      type: String,
      required: [true, 'Party is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    originalImageUrl: {
      type: String,
      trim: true,
    },
    generatedImageUrl: {
      type: String,
      required: [true, 'Generated image URL is required'],
      trim: true,
    },
    generatedImagePublicId: {
      type: String,
      required: [true, 'Generated image public ID is required'],
      trim: true,
    },
    layout: {
      type: PosterLayoutSchema,
      required: [true, 'Layout configuration is required'],
    },
  },
  {
    timestamps: true,
  }
);

export const Poster = mongoose.model<IPosterDocument>('Poster', PosterSchema);
