import { Router } from 'express';
import {
  generatePosterController,
  getUserPostersController,
  regeneratePosterController,
} from '../controllers/poster.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { posterRateLimiter } from '../middlewares/rate-limit.middleware.js';

const router = Router();

// GET /api/posters - Fetch authenticated user's poster history
router.get('/', authenticate, getUserPostersController);

// POST /api/posters/generate - Generate poster & save to history (rate limited: 5 requests per 15 mins)
router.post('/generate', authenticate, posterRateLimiter, generatePosterController);

// POST /api/posters/:id/regenerate - Regenerate an existing poster for authenticated user
router.post('/:id/regenerate', authenticate, regeneratePosterController);

export default router;
