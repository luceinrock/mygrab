import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

// Clients obtain JWTs by calling Supabase Auth SDK directly (signUp, signInWithOtp, signOut).
// This API only needs /me — the join between JWT identity and our profiles table.
const notImplemented = (_req: Request, res: Response): void => {
  res.status(501).json({
    error: 'not_implemented',
    message: 'Use Supabase Auth SDK on the client (signUp / signInWithOtp / signOut)',
  });
};

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone_number, email, role, profile_photo_url, is_active, created_at')
      .eq('id', req.user!.id)
      .single();

    if (error) throw error;
    res.json({ profile: data });
  } catch (err) {
    next(err);
  }
});

router.post('/signup', notImplemented);
router.post('/login', notImplemented);
router.post('/otp/verify', notImplemented);
router.post('/logout', notImplemented);

export default router;
