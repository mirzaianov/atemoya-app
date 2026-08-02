import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import { createDataProtectionFromEnvironment } from '../lib/data-protection-config.ts';
import { logSecurityEvent } from '../lib/security-logger.ts';
import {
  assertConversionIntent,
  DataConversionError,
  runDataConversion,
} from './data-conversion.ts';
import * as schema from './data-conversion-schema.ts';
import { createTestDatabase } from './test-database.ts';

const fail = (): never => {
  throw new DataConversionError();
};

const run = async () => {
  let conversionStarted = false;

  try {
    const [target, confirmation, ...unexpectedArguments] = process.argv.slice(2);

    if (unexpectedArguments.length > 0) {
      return fail();
    }

    const confirmedTarget = assertConversionIntent(target, confirmation);
    const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

    if (!betterAuthSecret) {
      return fail();
    }

    const dataProtection = createDataProtectionFromEnvironment(process.env);
    let db;

    if (confirmedTarget === 'test') {
      const testDatabase = await createTestDatabase();

      db = testDatabase.conversionDb;
    } else {
      const expectedAppEnvironment = confirmedTarget === 'production' ? 'prod' : 'dev';
      const databaseUrl = process.env.DATABASE_URL;

      if (process.env.APP_ENV !== expectedAppEnvironment || !databaseUrl) {
        return fail();
      }

      db = drizzle({ client: neon(databaseUrl), schema });
    }

    conversionStarted = true;
    await runDataConversion({
      betterAuthSecret,
      confirmation,
      dataProtection,
      db,
      target,
    });
  } catch {
    if (!conversionStarted) {
      logSecurityEvent({ code: 'data_conversion_failure', phase: 'intent', severity: 'error' });
    }

    process.exitCode = 1;
  }
};

await run();
