import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import pino from 'pino';
import { ZodError } from 'zod';

import { env } from './config/env';
import authRouter from './routes/auth';
import ridesRouter from './routes/rides';
import pricingRouter from './routes/pricing';
import driversRouter from './routes/drivers';
import ridersRouter from './routes/riders';
import paymentsRouter from './routes/payments';
import adminRouter from './routes/admin';

const logger = pino({ level: env.NODE_ENV === 'production' ? 'info' : 'debug' });
const app = express();

// CORS — allow specific origins in production, all in dev
const allowedOrigins = env.CORS_ORIGIN
  ? env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : true; // true = reflect any origin in dev

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(pinoHttp({ logger }));

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Slow down — too many requests.' },
});

// Tighter limit for ride creation (anti-spam)
const rideRequestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Too many ride requests. Wait a moment.' },
});

// Higher limit for location batch — drivers call this every 15 s
const locationBatchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Location update rate exceeded.' },
});

app.use(globalLimiter);

app.get('/healthz', (_req: Request, res: Response) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/rides/request', rideRequestLimiter);
app.use('/api/v1/rides', ridesRouter);
app.use('/api/v1/pricing', pricingRouter);
app.use('/api/v1/drivers/location/batch', locationBatchLimiter);
app.use('/api/v1/drivers', driversRouter);
app.use('/api/v1/riders', ridersRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/admin', adminRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'not_found' });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'validation_error', issues: err.flatten().fieldErrors });
    return;
  }
  logger.error(err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: 'internal_error', message });
});

app.listen(env.PORT, () => {
  logger.info(`RideNow API listening on :${env.PORT} [${env.NODE_ENV}]`);
});
