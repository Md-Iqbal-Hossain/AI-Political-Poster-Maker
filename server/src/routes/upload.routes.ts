import { Router } from 'express';
import { uploadImage } from '../controllers/upload.controller.js';
import { handleImageUpload } from '../middlewares/upload.middleware.js';

const router = Router();

router.post('/image', handleImageUpload, uploadImage);

export default router;
