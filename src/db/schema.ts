import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const user = pgTable(
  'user',
  {
    createdAt: timestamp('created_at').defaultNow().notNull(),
    email: text('email').unique(),
    emailCiphertext: text('email_ciphertext'),
    emailLookup: text('email_lookup'),
    emailVerified: boolean('email_verified').default(false).notNull(),
    id: text('id').primaryKey(),
    image: text('image'),
    imageCiphertext: text('image_ciphertext'),
    name: text('name').unique(),
    nameCiphertext: text('name_ciphertext'),
    nameLookup: text('name_lookup'),
    twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('user_email_lookup_unique_idx')
      .on(table.emailLookup)
      .where(sql`${table.emailLookup} IS NOT NULL`),
    uniqueIndex('user_name_lookup_unique_idx')
      .on(table.nameLookup)
      .where(sql`${table.nameLookup} IS NOT NULL`),
  ],
);

export const session = pgTable(
  'session',
  {
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    id: text('id').primaryKey(),
    ipAddress: text('ip_address'),
    ipAddressCiphertext: text('ip_address_ciphertext'),
    token: text('token').unique(),
    tokenCiphertext: text('token_ciphertext'),
    tokenLookup: text('token_lookup'),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    userAgent: text('user_agent'),
    userAgentCiphertext: text('user_agent_ciphertext'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('session_token_lookup_unique_idx')
      .on(table.tokenLookup)
      .where(sql`${table.tokenLookup} IS NOT NULL`),
    index('session_user_id_idx').on(table.userId),
  ],
);

export const account = pgTable(
  'account',
  {
    accessToken: text('access_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    accountId: text('account_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    id: text('id').primaryKey(),
    idToken: text('id_token'),
    password: text('password'),
    providerId: text('provider_id').notNull(),
    refreshToken: text('refresh_token'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
);

export const verification = pgTable(
  'verification',
  {
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    id: text('id').primaryKey(),
    identifier: text('identifier'),
    identifierCiphertext: text('identifier_ciphertext'),
    identifierLookup: text('identifier_lookup'),
    purpose: text('purpose'),
    subjectUserId: text('subject_user_id'),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    value: text('value'),
    valueCiphertext: text('value_ciphertext'),
  },
  (table) => [
    index('verification_identifier_idx').on(table.identifier),
    index('verification_identifier_lookup_idx')
      .on(table.identifierLookup)
      .where(sql`${table.identifierLookup} IS NOT NULL`),
    index('verification_purpose_subject_user_id_idx')
      .on(table.purpose, table.subjectUserId)
      .where(sql`${table.subjectUserId} IS NOT NULL`),
  ],
);

export const twoFactor = pgTable(
  'two_factor',
  {
    backupCodes: text('backup_codes').notNull(),
    failedVerificationCount: integer('failed_verification_count').default(0).notNull(),
    id: text('id').primaryKey(),
    lockedUntil: timestamp('locked_until'),
    secret: text('secret').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    verified: boolean('verified').default(true).notNull(),
  },
  (table) => [
    index('two_factor_secret_idx').on(table.secret),
    index('two_factor_user_id_idx').on(table.userId),
  ],
);

export const tasks = pgTable(
  'tasks',
  {
    changedOn: timestamp('changed_on').notNull(),
    completedAt: timestamp('completed_at'),
    id: text('id').primaryKey(),
    position: integer('position').notNull(),
    title: text('title'),
    titleCiphertext: text('title_ciphertext'),
    titleLookup: text('title_lookup'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('tasks_user_id_title_unique_idx').on(table.userId, sql`lower(${table.title})`),
    uniqueIndex('tasks_user_id_title_lookup_unique_idx')
      .on(table.userId, table.titleLookup)
      .where(sql`${table.titleLookup} IS NOT NULL`),
    index('tasks_user_id_position_idx').on(table.userId, table.position),
    index('tasks_user_id_changed_on_idx').on(table.userId, table.changedOn),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
  tasks: many(tasks),
  twoFactors: many(twoFactor),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(user, {
    fields: [tasks.userId],
    references: [user.id],
  }),
}));
