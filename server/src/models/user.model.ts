import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'user' | 'admin';

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

export interface IUserDocument extends IUser, Document {}

const UserSchema: Schema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUserDocument>('User', UserSchema);
