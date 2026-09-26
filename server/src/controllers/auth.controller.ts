import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/user.model.js';
import { generateToken, setAuthCookie, clearAuthCookie } from '../utils/jwt.js';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ success: false, message: errorMessage });
      return;
    }

    const { name, email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'User with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: 'user',
    });

    const tokenPayload = {
      userId: (newUser._id as unknown as string).toString(),
      email: newUser.email,
      role: newUser.role,
    };

    const token = generateToken(tokenPayload);
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ success: false, message: errorMessage });
      return;
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const tokenPayload = {
      userId: (user._id as unknown as string).toString(),
      email: user.email,
      role: user.role,
    };

    const token = generateToken(tokenPayload);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  clearAuthCookie(res);
  res.status(200).json({ success: true, message: 'Logout successful' });
};

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};
