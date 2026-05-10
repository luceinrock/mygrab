import { Router } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { RideService } from '../services/rideService';
import { createRideSchema, updateRideStatusSchema, sosSchema } from '../types/schemas';

const router = Router();
const rideService = new RideService();

/**
 * @route   POST /api/rides
 * @desc    Create a new ride request (Customer)
 * @access  Private (Customer)
 */
router.post('/', authenticate, requireRole('customer'), async (req: AuthRequest, res) => {
  try {
    const validation = createRideSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid input', details: validation.error.errors });
    }

    const ride = await rideService.createRide(req.user!.id, validation.data);
    res.status(201).json(ride);
  } catch (error: any) {
    console.error('Create ride error:', error);
    res.status(500).json({ error: error.message || 'Failed to create ride' });
  }
});

/**
 * @route   GET /api/rides/nearby
 * @desc    Get nearby ride requests (Driver)
 * @access  Private (Driver)
 */
router.get('/nearby', authenticate, requireRole('driver'), async (req: AuthRequest, res) => {
  try {
    const { lat, lng, radius } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const rides = await rideService.getNearbyRides(
      parseFloat(lat as string),
      parseFloat(lng as string),
      radius ? parseFloat(radius as string) : 5
    );

    res.json(rides);
  } catch (error: any) {
    console.error('Get nearby rides error:', error);
    res.status(500).json({ error: error.message || 'Failed to get nearby rides' });
  }
});

/**
 * @route   POST /api/rides/:id/accept
 * @desc    Accept a ride (Driver)
 * @access  Private (Driver)
 */
router.post('/:id/accept', authenticate, requireRole('driver'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const ride = await rideService.acceptRide(req.user!.id, id);
    res.json(ride);
  } catch (error: any) {
    console.error('Accept ride error:', error);
    res.status(400).json({ error: error.message || 'Failed to accept ride' });
  }
});

/**
 * @route   PUT /api/rides/:id/status
 * @desc    Update ride status (Driver/Customer)
 * @access  Private
 */
router.put('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validation = updateRideStatusSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid input', details: validation.error.errors });
    }

    const ride = await rideService.updateRideStatus(id, validation.data, req.user!.id);
    res.json(ride);
  } catch (error: any) {
    console.error('Update ride status error:', error);
    res.status(500).json({ error: error.message || 'Failed to update ride status' });
  }
});

/**
 * @route   POST /api/rides/:id/cancel
 * @desc    Cancel a ride (Driver/Customer)
 * @access  Private
 */
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Cancellation reason required' });
    }

    const ride = await rideService.cancelRide(id, req.user!.id, reason);
    res.json(ride);
  } catch (error: any) {
    console.error('Cancel ride error:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel ride' });
  }
});

/**
 * @route   POST /api/rides/:id/sos
 * @desc    Trigger SOS emergency (Driver/Customer)
 * @access  Private
 */
router.post('/:id/sos', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validation = sosSchema.safeParse({ ride_id: id, ...req.body });
    
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid input', details: validation.error.errors });
    }

    const ride = await rideService.triggerSOS(
      id,
      req.user!.id,
      validation.data.emergency_type,
      validation.data.description
    );

    res.json({ message: 'SOS triggered successfully', ride });
  } catch (error: any) {
    console.error('SOS trigger error:', error);
    res.status(500).json({ error: error.message || 'Failed to trigger SOS' });
  }
});

/**
 * @route   GET /api/rides/:id
 * @desc    Get ride details by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const ride = await rideService.getRideById(id);
    
    // Check if user is authorized to view this ride
    if (ride.customer_id !== req.user!.id && ride.driver_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to view this ride' });
    }

    res.json(ride);
  } catch (error: any) {
    console.error('Get ride error:', error);
    res.status(500).json({ error: error.message || 'Failed to get ride' });
  }
});

/**
 * @route   GET /api/rides/my/history
 * @desc    Get customer's ride history
 * @access  Private (Customer)
 */
router.get('/my/history', authenticate, requireRole('customer'), async (req: AuthRequest, res) => {
  try {
    const { limit } = req.query;
    const rides = await rideService.getCustomerRides(
      req.user!.id,
      limit ? parseInt(limit as string) : 20
    );
    res.json(rides);
  } catch (error: any) {
    console.error('Get ride history error:', error);
    res.status(500).json({ error: error.message || 'Failed to get ride history' });
  }
});

export default router;
