import { stderr } from 'node:process';

import type { BetterAuthOptions } from 'better-auth';

type BetterAuthLogger = NonNullable<BetterAuthOptions['logger']>;
type BetterAuthLog = NonNullable<BetterAuthLogger['log']>;

interface BetterAuthSecurityEvent {
  code: 'better_auth_event';
  severity: Parameters<BetterAuthLog>[0];
}

interface BetterAuthAdapterSecurityEvent {
  code: 'better_auth_adapter_failure';
  operation:
    | 'consumeOne'
    | 'count'
    | 'create'
    | 'delete'
    | 'deleteMany'
    | 'findMany'
    | 'findOne'
    | 'incrementOne'
    | 'transaction'
    | 'update'
    | 'updateMany';
  severity: 'error';
}

interface TaskQuerySecurityEvent {
  category: 'DATA_UNAVAILABLE' | 'DUPLICATE_TITLE' | 'OPERATION_FAILED';
  code: 'task_query_failure';
  operation:
    | 'complete'
    | 'create'
    | 'delete'
    | 'find_duplicate'
    | 'list'
    | 'reorder'
    | 'restore'
    | 'update';
  recordId?: string;
  severity: 'error';
}

interface DataConversionFailureEvent {
  code: 'data_conversion_failure';
  phase: 'intent' | 'preflight';
  severity: 'error';
}

interface DataConversionProgressEvent {
  code: 'data_conversion_progress';
  count: number;
  phase: 'preflight';
  severity: 'info';
}

type SecurityEvent =
  | BetterAuthAdapterSecurityEvent
  | BetterAuthSecurityEvent
  | DataConversionFailureEvent
  | DataConversionProgressEvent
  | TaskQuerySecurityEvent;

export const logSecurityEvent = (event: SecurityEvent) => {
  stderr.write(`${JSON.stringify(event)}\n`);
};

export const betterAuthLogger: BetterAuthLogger = {
  level: 'warn',
  log: (severity) => logSecurityEvent({ code: 'better_auth_event', severity }),
};
