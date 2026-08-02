import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import { getDataProtection } from '../lib/data-protection-config.ts';
import * as schema from './schema.ts';

getDataProtection();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

const sql = neon(databaseUrl);

export const db = drizzle({ client: sql, schema });
