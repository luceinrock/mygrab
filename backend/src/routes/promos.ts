import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

export function applyDiscount(fare: number, discountType: string, discountValue: number): number {
  if (discountType === 'percent') {
    return parseFloat((fare * (1 - discountValue / 100)).toFixed(2));
  }
  return parseFloat(Math.max(0, fare - discountValue).toFixed(2));
}

export async function validatePromoCode(
  code: string,
  fare: number,
  customerId: string,
): Promise<
  | { valid: true; promo: Record<string, unknown>; discountedFare: number; savings: number }
  | { valid: false; reason: string; min_fare?: number }
> {
  const { data: promo, error } = await supabaseAdmin
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (error || !promo) return { valid: false, reason: 'not_found' };

  const now = new Date();
  if (promo.valid_from && new Date(promo.valid_from as string) > now)
    return { valid: false, reason: 'not_started' };
  if (promo.valid_until && new Date(promo.valid_until as string) < now)
    return { valid: false, reason: 'expired' };
  if (promo.max_uses !== null && (promo.times_used as number) >= (promo.max_uses as number))
    return { valid: false, reason: 'exhausted' };
  if (fare < Number(promo.min_fare))
    return { valid: false, reason: 'below_min_fare', min_fare: Number(promo.min_fare) };

  const { count } = await supabaseAdmin
    .from('rides')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .eq('promo_code', promo.code as string)
    .neq('status', 'cancelled');

  if ((count ?? 0) >= (promo.uses_per_rider as number))
    return { valid: false, reason: 'already_used' };

  const discountedFare = applyDiscount(fare, promo.discount_type as string, Number(promo.discount_value));
  const savings = parseFloat((fare - discountedFare).toFixed(2));

  return { valid: true, promo, discountedFare, savings };
}

// GET /api/v1/promos/validate?code=XXX&fare=YYY
router.get(
  '/validate',
  authenticate,
  requireRole(['customer']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, fare: fareStr } = req.query;
      if (!code || typeof code !== 'string') {
        res.status(400).json({ valid: false, reason: 'missing_code' });
        return;
      }
      const fare = parseFloat(fareStr as string);
      if (isNaN(fare) || fare <= 0) {
        res.status(400).json({ valid: false, reason: 'invalid_fare' });
        return;
      }

      const result = await validatePromoCode(code, fare, req.user!.id);
      if (!result.valid) {
        res.json(result);
        return;
      }
      res.json({
        valid: true,
        code: result.promo.code,
        description: result.promo.description,
        discount_type: result.promo.discount_type,
        discount_value: Number(result.promo.discount_value),
        discounted_fare: result.discountedFare,
        savings: result.savings,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
