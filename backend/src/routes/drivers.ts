import { Router } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { DriverService } from '../services/driverService';
import { locationUpdateSchema, topupSchema } from '../types/schemas';

const router = Router();
const driverService = new DriverService();

/**
 * @route   POST /api/drivers/location
 * @desc    Update driver location (batched)
 * @access  Private (Driver)
 */
router.post('/location', authenticate, requireRole('driver'), async (req: AuthRequest, res) => {
  try {
    const validation = locationUpdateSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid input', details: validation.error.errors });
    }

    await driverService.updateLocation(req.user!.id, validation.data);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Update location error:', error);
    res.status(500).json({ error: error.message || 'Failed to update location' });
  }
});

/**
 * @route   POST /api/drivers/online
 * @desc    Set driver online/offline status
 * @access  Private (Driver)
 */
router.post('/online', authenticate, requireRole('driver'), async (req: AuthRequest, res) => {
  try {
    const { isOnline } = req.body;
    
    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ error: 'isOnline boolean required' });
    }

    const result = await driverService.setOnlineStatus(req.user!.id, isOnline);
    res.json(result);
  } catch (error: any) {
    console.error('Set online status error:', error);
    res.status(400).json({ error: error.message || 'Failed to update online status' });
  }
});

/**
 * @route   POST /api/drivers/available
 * @desc    Set driver availability
 * @access  Private (Driver)
 */
router.post('/available', authenticate, requireRole('driver'), async (req: AuthRequest, res) => {
  try {
    const { isAvailable } = req.body;
    
    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ error: 'isAvailable boolean required' });
    }

    const result = await driverService.setAvailability(req.user!.id, isAvailable);
    res.json(result);
  } catch (error: any) {
    console.error('Set availability error:', error);
    res.status(500).json({ error: error.message || 'Failed to update availability' });
  }
});

/**
 * @route   GET /api/drivers/profile
 * @desc    Get driver profile with wallet info
 * @access  Private (Driver)
 */
router.get('/profile', authenticate, requireRole('driver'), async (req: AuthRequest, res) => {
  try {
    const profile = await driverService.getDriverProfile(req.user!.id);
    res.json(profile);
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message || 'Failed to get profile' });
  }
});

/**
 * @route   POST /api/drivers/wallet/topup
 * @desc    Process wallet topup
 * @access  Private (Driver)
 */
router.post('/wallet/topup', authenticate, requireRole('driver'), async (req: AuthRequest, res) => {
  try {
    const validation = topupSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid input', details: validation.error.errors });
    }

    const result = await driverService.processTopup(req.user!.id, validation.data);
    res.json(result);
  } catch (error: any) {
    console.error('Topup error:', error);
    res.status(500).json({ error: error.message || 'Failed to process topup' });
  }
});

/**
 * @route   GET /api/drivers/wallet/history
 * @desc    Get driver transaction history
 * @access  Private (Driver)
 */
router.get('/wallet/history', authenticate, requireRole('driver'), async (req: AuthRequest, res) => {
  try {
    const { limit } = req.query;
    const transactions = await driverService.getTransactionHistory(
      req.user!.id,
      limit ? parseInt(limit as string) : 50
    );
    res.json(transactions);
  } catch (error: any) {
    console.error('Get transaction history error:', error);
    res.status(500).json({ error: error.message || 'Failed to get transaction history' });
  }
});

/**
 * @route   GET /api/drivers/nearby
 * @desc    Get nearby drivers (Admin/Dispatch)
 * @access  Private (Admin)
 */
router.get('/nearby', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { lat, lng, radius } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const drivers = await driverService.getNearbyDrivers(
      parseFloat(lat as string),
      parseFloat(lng as string),
      radius ? parseFloat(radius as string) : 5
    );

    res.json(drivers);
  } catch (error: any) {
    console.error('Get nearby drivers error:', error);
    res.status(500).json({ error: error.message || 'Failed to get nearby drivers' });
  }
});

export default router;
