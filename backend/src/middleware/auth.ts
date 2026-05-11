import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import type { AuthedUser, UserRole } from '../types';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token', message: 'Authorization header required' });
    return;
  }

  const token = authHeader.slice(7);

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'invalid_token', message: 'Token is invalid or expired' });
    return;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    res.status(401).json({ error: 'profile_not_found', message: 'User profile not found' });
    return;
  }

  req.user = {
    id: user.id,
    role: profile.role as UserRole,
    email: user.email ?? null,
    phone: user.phone ?? null,
  };

  next();
}
