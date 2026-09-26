import { Router } from 'express';
import {
  generatePosterController,
  getUserPostersController,
  regeneratePosterController,
} from '../controllers/poster.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/posters - Fetch authenticated user's poster history
router.get('/', authenticate, getUserPostersController);

// POST /api/posters/generate - Generate poster & save to history
router.post('/generate', authenticate, generatePosterController);

// POST /api/posters/:id/regenerate - Regenerate an existing poster for authenticated user
router.post('/:id/regenerate', authenticate, regeneratePosterController);

export default router;
