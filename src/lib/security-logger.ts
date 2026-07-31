import { stderr } from 'node:process';

import type { BetterAuthOptions } from 'better-auth';

type BetterAuthLogger = NonNullable<BetterAuthOptions['logger']>;
type BetterAuthLog = NonNullable<BetterAuthLogger['log']>;

interface BetterAuthSecurityEvent {
  code: 'better_auth_event';
  severity: Parameters<BetterAuthLog>[0];
}

type ExactSecurityEvent<Event extends BetterAuthSecurityEvent> = Event &
  Record<Exclude<keyof Event, keyof BetterAuthSecurityEvent>, never>;

export const logSecurityEvent = <const Event extends BetterAuthSecurityEvent>(
  event: ExactSecurityEvent<Event>,
) => {
  stderr.write(`${JSON.stringify(event)}\n`);
};

export const betterAuthLogger: BetterAuthLogger = {
  level: 'warn',
  log: (severity) => logSecurityEvent({ code: 'better_auth_event', severity }),
};
