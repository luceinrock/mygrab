export type UserRole = 'customer' | 'driver' | 'admin';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';
export type RideStatus =
  | 'requested'
  | 'accepted'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';
export type PaymentMethod = 'gcash' | 'cash' | 'paymaya';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type WalletState = 'ACTIVE_GREEN' | 'ACTIVE_YELLOW' | 'BLOCKED_RED';

export interface AuthedUser {
  id: string;
  role: UserRole;
  email: string | null;
  phone: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}
