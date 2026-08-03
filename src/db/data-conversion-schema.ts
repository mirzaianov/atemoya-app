import { pgTable, text } from 'drizzle-orm/pg-core';

// Pre-contract columns used only by the one-time production conversion command.
export const account = pgTable('account', {
  accessToken: text('access_token'),
  id: text('id').primaryKey(),
  idToken: text('id_token'),
  refreshToken: text('refresh_token'),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  ipAddress: text('ip_address'),
  ipAddressCiphertext: text('ip_address_ciphertext'),
  token: text('token'),
  tokenCiphertext: text('token_ciphertext'),
  tokenLookup: text('token_lookup'),
  userAgent: text('user_agent'),
  userAgentCiphertext: text('user_agent_ciphertext'),
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title'),
  titleCiphertext: text('title_ciphertext'),
  titleLookup: text('title_lookup'),
  userId: text('user_id').notNull(),
});

export const twoFactor = pgTable('two_factor', {
  backupCodes: text('backup_codes').notNull(),
  id: text('id').primaryKey(),
  secret: text('secret').notNull(),
});

export const user = pgTable('user', {
  email: text('email'),
  emailCiphertext: text('email_ciphertext'),
  emailLookup: text('email_lookup'),
  id: text('id').primaryKey(),
  image: text('image'),
  imageCiphertext: text('image_ciphertext'),
  name: text('name'),
  nameCiphertext: text('name_ciphertext'),
  nameLookup: text('name_lookup'),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier'),
  identifierCiphertext: text('identifier_ciphertext'),
  identifierLookup: text('identifier_lookup'),
  purpose: text('purpose'),
  subjectUserId: text('subject_user_id'),
  value: text('value'),
  valueCiphertext: text('value_ciphertext'),
});
