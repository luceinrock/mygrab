import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

const stub = (_req: Request, res: Response): void => {
  res.status(501).json({ error: 'not_implemented', message: 'Coming soon' });
};

router.get('/profile', authenticate, requireRole(['customer']), stub);
router.put('/profile', authenticate, requireRole(['customer']), stub);
router.get('/history', authenticate, requireRole(['customer']), stub);
router.get('/favorites', authenticate, requireRole(['customer']), stub);
router.post('/favorites', authenticate, requireRole(['customer']), stub);

export default router;
