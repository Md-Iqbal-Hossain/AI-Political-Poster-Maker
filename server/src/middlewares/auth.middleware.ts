import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    let token = req.cookies?.token;

    // Fallback to Bearer token in Authorization header if present
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing token',
      });
      return;
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token',
    });
    return;
  }
};
