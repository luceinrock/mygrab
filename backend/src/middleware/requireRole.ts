import { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../types';

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'forbidden',
        message: `Requires role: ${roles.join(' or ')}`,
      });
      return;
    }
    next();
  };
}
