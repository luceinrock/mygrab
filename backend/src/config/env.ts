import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  MAPBOX_ACCESS_TOKEN: z.string().optional(),
  ONESIGNAL_APP_ID: z.string().optional(),
  ONESIGNAL_REST_API_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().optional(), // comma-separated list of allowed origins
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
