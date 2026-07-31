import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate as runMigrations } from 'drizzle-orm/neon-http/migrator';

import * as schema from './schema.ts';

const expectedDatabaseName = 'atemoya_test';
const expectedRoleName = 'atemoya_test_owner';

interface DatabaseIdentity extends Record<string, unknown> {
  databaseName: string;
  roleName: string;
}

export const requireTestDatabaseUrl = (databaseUrl?: string) => {
  if (!databaseUrl) {
    throw new Error('TEST_DATABASE_URL is required for integration tests.');
  }

  return databaseUrl;
};

export const assertTestDatabaseIdentity = (identity: DatabaseIdentity | undefined) => {
  if (identity?.databaseName !== expectedDatabaseName || identity.roleName !== expectedRoleName) {
    throw new Error(
      `Integration writes require database ${expectedDatabaseName} and role ${expectedRoleName}.`,
    );
  }
};

export const createTestDatabase = async () => {
  const databaseUrl = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL);
  const client = neon(databaseUrl);
  const db = drizzle({ client, schema });

  const assertIdentity = async () => {
    const result = await db.execute<DatabaseIdentity>(sql`
      SELECT
        current_database() AS "databaseName",
        current_user AS "roleName"
    `);

    assertTestDatabaseIdentity(result.rows[0]);
  };

  await assertIdentity();

  return {
    db,
    migrate: async () => {
      await assertIdentity();
      await runMigrations(db, { migrationsFolder: 'drizzle' });
    },
    reset: async () => {
      await assertIdentity();
      await db.execute(sql`
        TRUNCATE TABLE
          ${schema.tasks},
          ${schema.twoFactor},
          ${schema.verification},
          ${schema.account},
          ${schema.session},
          ${schema.user}
        RESTART IDENTITY CASCADE
      `);
    },
  };
};
