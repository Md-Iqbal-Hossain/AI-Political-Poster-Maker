import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { ENV } from '../config/env.js';
import { AuthUser } from '../types/express.js';

export const generateToken = (payload: AuthUser): string => {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: '7d',
  });
};

export const verifyToken = (token: string): AuthUser => {
  return jwt.verify(token, ENV.JWT_SECRET) as AuthUser;
};

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const clearAuthCookie = (res: Response): void => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });
};
