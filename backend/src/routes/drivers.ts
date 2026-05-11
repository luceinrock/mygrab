import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

const stub = (_req: Request, res: Response): void => {
  res.status(501).json({ error: 'not_implemented', message: 'Coming soon' });
};

router.get('/profile', authenticate, requireRole(['driver']), stub);
router.put('/profile', authenticate, requireRole(['driver']), stub);
router.post('/documents', authenticate, requireRole(['driver']), stub);
router.get('/documents', authenticate, requireRole(['driver']), stub);
router.post('/toggle-online', authenticate, requireRole(['driver']), stub);
router.post('/location/batch', authenticate, requireRole(['driver']), stub);
router.get('/earnings', authenticate, requireRole(['driver']), stub);
router.get('/rides', authenticate, requireRole(['driver']), stub);

export default router;
