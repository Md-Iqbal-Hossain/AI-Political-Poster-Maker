import { Router } from 'express';
import { getTemplates, getTemplateById } from '../controllers/template.controller.js';

const router = Router();

router.get('/', getTemplates);
router.get('/:id', getTemplateById);

export default router;
