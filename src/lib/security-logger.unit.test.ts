import assert from 'node:assert/strict';
import test from 'node:test';

import { betterAuthLogger } from './security-logger.ts';

test('discards Better Auth messages and arguments', (context) => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const markers = [
    'plaintext:user@example.com',
    'key:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'blind-index:BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    'query:SELECT * FROM user WHERE email = $1',
    'params:user@example.com',
    'enc:v1:1:iv:tag:ciphertext',
  ];

  context.mock.method(process.stdout, 'write', (chunk: string | Uint8Array) => {
    stdout.push(String(chunk));

    return true;
  });
  context.mock.method(process.stderr, 'write', (chunk: string | Uint8Array) => {
    stderr.push(String(chunk));

    return true;
  });

  betterAuthLogger.log?.('warn', markers[0] ?? '', ...markers.slice(1));
  betterAuthLogger.log?.('error', markers.join(' '), new Error(markers.join(' ')));

  assert.deepEqual(stdout, []);
  assert.deepEqual(stderr, [
    '{"code":"better_auth_event","severity":"warn"}\n',
    '{"code":"better_auth_event","severity":"error"}\n',
  ]);

  for (const marker of markers) {
    assert.equal(`${stdout.join('')}\n${stderr.join('')}`.includes(marker), false);
  }
});
