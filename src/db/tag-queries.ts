import { and, eq } from 'drizzle-orm';

import { DataProtectionError } from '../lib/data-protection.ts';
import { getDataProtection } from '../lib/data-protection-config.ts';
import { logSecurityEvent } from '../lib/security-logger.ts';
import type { Tag } from '../types.ts';
import { db } from './client.ts';
import { tags } from './schema.ts';

export type TagQueryErrorCode = 'DATA_UNAVAILABLE' | 'DUPLICATE_TAG' | 'OPERATION_FAILED';

export class TagQueryError extends Error {
  readonly code: TagQueryErrorCode;

  constructor(code: TagQueryErrorCode) {
    super(code);
    this.code = code;
    this.name = 'TagQueryError';
  }
}

type TagQueryOperation = 'create' | 'delete' | 'list' | 'update';
type TagWrite = Pick<Tag, 'color' | 'name'>;

const dataProtection = getDataProtection();

const getDatabaseErrorCode = (error: unknown) => {
  const candidates = [
    error,
    typeof error === 'object' && error !== null && 'cause' in error ? error.cause : null,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'object' && candidate !== null && 'code' in candidate) {
      return typeof candidate.code === 'string' ? candidate.code : null;
    }
  }

  return null;
};

const classifyTagQueryError = (error: unknown): TagQueryErrorCode => {
  if (error instanceof TagQueryError) {
    return error.code;
  }

  if (error instanceof DataProtectionError) {
    return 'DATA_UNAVAILABLE';
  }

  return getDatabaseErrorCode(error) === '23505' ? 'DUPLICATE_TAG' : 'OPERATION_FAILED';
};

const runTagQuery = async <Result>(
  operation: TagQueryOperation,
  query: () => Promise<Result>,
  recordId?: string,
) => {
  try {
    return await query();
  } catch (error) {
    const code = classifyTagQueryError(error);

    logSecurityEvent({
      category: code,
      code: 'tag_query_failure',
      operation,
      ...(recordId ? { recordId } : {}),
      severity: 'error',
    });

    throw error instanceof TagQueryError ? error : new TagQueryError(code);
  }
};

const decryptTag = ({
  color,
  id,
  nameCiphertext,
}: {
  color: string;
  id: string;
  nameCiphertext: string;
}): Tag => ({
  color,
  id,
  name: dataProtection.decryptValue(nameCiphertext, {
    field: 'name',
    model: 'tags',
    recordId: id,
  }),
});

export const listTags = (userId: string): Promise<Tag[]> =>
  runTagQuery('list', async () => {
    const records = await db
      .select({ color: tags.color, id: tags.id, nameCiphertext: tags.name })
      .from(tags)
      .where(eq(tags.userId, userId));

    // oxlint-disable-next-line unicorn/no-array-sort -- The project targets ES2022, before Array#toSorted.
    return records.map(decryptTag).sort((left, right) => left.name.localeCompare(right.name));
  });

export const createTag = (userId: string, input: TagWrite): Promise<Tag> => {
  const id = crypto.randomUUID();

  return runTagQuery(
    'create',
    async () => {
      const nameCiphertext = dataProtection.encryptValue(input.name, {
        field: 'name',
        model: 'tags',
        recordId: id,
      });
      const nameLookup = dataProtection.tagNameLookup(userId, input.name);
      const [created] = await db
        .insert(tags)
        .values({ ...input, id, name: nameCiphertext, nameLookup, userId })
        .onConflictDoNothing({ target: [tags.userId, tags.nameLookup] })
        .returning({ color: tags.color, id: tags.id, nameCiphertext: tags.name });

      if (created) {
        return decryptTag(created);
      }

      const [existing] = await db
        .select({ color: tags.color, id: tags.id, nameCiphertext: tags.name })
        .from(tags)
        .where(and(eq(tags.userId, userId), eq(tags.nameLookup, nameLookup)))
        .limit(1);

      if (!existing) {
        throw new TagQueryError('OPERATION_FAILED');
      }

      return decryptTag(existing);
    },
    id,
  );
};

export const updateTag = (userId: string, id: string, input: TagWrite) =>
  runTagQuery(
    'update',
    async () => {
      const name = dataProtection.encryptValue(input.name, {
        field: 'name',
        model: 'tags',
        recordId: id,
      });
      const nameLookup = dataProtection.tagNameLookup(userId, input.name);
      const [updated] = await db
        .update(tags)
        .set({ color: input.color, name, nameLookup })
        .where(and(eq(tags.userId, userId), eq(tags.id, id)))
        .returning({ id: tags.id });

      return Boolean(updated);
    },
    id,
  );

export const deleteTag = (userId: string, id: string) =>
  runTagQuery(
    'delete',
    async () => {
      const [deleted] = await db
        .delete(tags)
        .where(and(eq(tags.userId, userId), eq(tags.id, id)))
        .returning({ id: tags.id });

      return Boolean(deleted);
    },
    id,
  );
