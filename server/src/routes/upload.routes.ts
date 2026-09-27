import { Router } from 'express';
import { uploadImage } from '../controllers/upload.controller.js';
import { handleImageUpload } from '../middlewares/upload.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/image', authenticate, handleImageUpload, uploadImage);

export default router;

