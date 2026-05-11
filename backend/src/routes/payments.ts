import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

const stub = (_req: Request, res: Response): void => {
  res.status(501).json({ error: 'not_implemented', message: 'Coming soon' });
};

router.post('/initiate', authenticate, stub);
router.post('/callback', stub); // No auth — webhook from GCash/PayMaya
router.get('/:id', authenticate, stub);
router.post('/:id/refund', authenticate, stub);

export default router;
