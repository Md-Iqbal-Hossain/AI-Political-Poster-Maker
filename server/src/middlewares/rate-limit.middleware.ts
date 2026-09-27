import { Request, Response, NextFunction } from 'express';

// In-memory store mapping userId -> array of timestamps (ms)
const posterGenerationStore = new Map<string, number[]>();

/**
 * Resets the in-memory rate limit store. Useful for unit and integration testing.
 */
export const resetPosterRateLimitStore = (): void => {
  posterGenerationStore.clear();
};

/**
 * Rate limiting middleware for poster generation.
 * Limits each authenticated user (identified by req.user.userId) to 5 generation requests per 15 minutes.
 */
export const posterRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing user authentication',
    });
    return;
  }

  const windowMs = 15 * 60 * 1000; // 15 minutes window
  const maxRequests = 5; // Maximum 5 requests allowed
  const now = Date.now();

  // Retrieve user request timestamps and filter out timestamps older than windowMs
  const userTimestamps = posterGenerationStore.get(userId) || [];
  const validTimestamps = userTimestamps.filter((timestamp) => now - timestamp < windowMs);

  if (validTimestamps.length >= maxRequests) {
    // Update store with pruned timestamps
    posterGenerationStore.set(userId, validTimestamps);

    res.status(429).json({
      success: false,
      message: 'Too many poster generation requests. You have reached the limit of 5 poster generations per 15 minutes. Please try again later.',
    });
    return;
  }

  validTimestamps.push(now);
  posterGenerationStore.set(userId, validTimestamps);

  next();
};
