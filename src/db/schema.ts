import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const user = pgTable(
  'user',
  {
    createdAt: timestamp('created_at').defaultNow().notNull(),
    email: text('email_ciphertext').notNull(),
    emailLookup: text('email_lookup').notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    id: text('id').primaryKey(),
    image: text('image_ciphertext'),
    name: text('name_ciphertext').notNull(),
    nameLookup: text('name_lookup').notNull(),
    twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('user_email_lookup_unique_idx').on(table.emailLookup),
    uniqueIndex('user_name_lookup_unique_idx').on(table.nameLookup),
  ],
);

export const session = pgTable(
  'session',
  {
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    id: text('id').primaryKey(),
    ipAddress: text('ip_address_ciphertext'),
    token: text('token_ciphertext').notNull(),
    tokenLookup: text('token_lookup').notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    userAgent: text('user_agent_ciphertext'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('session_token_lookup_unique_idx').on(table.tokenLookup),
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
    identifier: text('identifier_ciphertext').notNull(),
    identifierLookup: text('identifier_lookup').notNull(),
    purpose: text('purpose').notNull(),
    subjectUserId: text('subject_user_id'),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    value: text('value_ciphertext').notNull(),
  },
  (table) => [
    index('verification_identifier_lookup_idx').on(table.identifierLookup),
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
    title: text('title_ciphertext').notNull(),
    titleLookup: text('title_lookup').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('tasks_user_id_id_unique_idx').on(table.userId, table.id),
    uniqueIndex('tasks_user_id_title_lookup_unique_idx').on(table.userId, table.titleLookup),
    index('tasks_user_id_position_idx').on(table.userId, table.position),
    index('tasks_user_id_changed_on_idx').on(table.userId, table.changedOn),
  ],
);

export const tags = pgTable(
  'tags',
  {
    color: text('color').notNull(),
    id: text('id').primaryKey(),
    name: text('name_ciphertext').notNull(),
    nameLookup: text('name_lookup').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('tags_user_id_id_unique_idx').on(table.userId, table.id),
    uniqueIndex('tags_user_id_name_lookup_unique_idx').on(table.userId, table.nameLookup),
  ],
);

export const taskTags = pgTable(
  'task_tags',
  {
    tagId: text('tag_id').notNull(),
    taskId: text('task_id').notNull(),
    userId: text('user_id').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.taskId, table.tagId],
      name: 'task_tags_user_id_task_id_tag_id_pk',
    }),
    foreignKey({
      columns: [table.userId, table.taskId],
      foreignColumns: [tasks.userId, tasks.id],
      name: 'task_tags_user_task_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId, table.tagId],
      foreignColumns: [tags.userId, tags.id],
      name: 'task_tags_user_tag_fk',
    }).onDelete('cascade'),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
  tagAssignments: many(taskTags),
  tags: many(tags),
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

export const tasksRelations = relations(tasks, ({ many, one }) => ({
  tagAssignments: many(taskTags),
  user: one(user, {
    fields: [tasks.userId],
    references: [user.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many, one }) => ({
  taskAssignments: many(taskTags),
  user: one(user, {
    fields: [tags.userId],
    references: [user.id],
  }),
}));

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  tag: one(tags, {
    fields: [taskTags.tagId],
    references: [tags.id],
  }),
  task: one(tasks, {
    fields: [taskTags.taskId],
    references: [tasks.id],
  }),
  user: one(user, {
    fields: [taskTags.userId],
    references: [user.id],
  }),
}));
