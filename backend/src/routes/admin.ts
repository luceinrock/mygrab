import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

const stub = (_req: Request, res: Response): void => {
  res.status(501).json({ error: 'not_implemented', message: 'Coming soon' });
};

router.get('/users', authenticate, requireRole(['admin']), stub);
router.get('/drivers/pending', authenticate, requireRole(['admin']), stub);
router.post('/drivers/:id/approve', authenticate, requireRole(['admin']), stub);
router.post('/drivers/:id/reject', authenticate, requireRole(['admin']), stub);
router.get('/rides', authenticate, requireRole(['admin']), stub);
router.post('/promos', authenticate, requireRole(['admin']), stub);
router.get('/analytics/overview', authenticate, requireRole(['admin']), stub);

export default router;
