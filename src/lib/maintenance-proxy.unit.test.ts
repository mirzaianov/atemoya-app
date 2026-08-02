import assert from 'node:assert/strict';
import test from 'node:test';

import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server.js';
import { NextRequest } from 'next/server.js';

import { config, proxy } from '../../proxy.ts';

const guardedRequests = [
  new NextRequest('https://atemoya.test/'),
  new NextRequest('https://atemoya.test/api/auth/sign-in/email', { method: 'POST' }),
  new NextRequest('https://atemoya.test/settings', {
    headers: { 'next-action': 'test-action' },
    method: 'POST',
  }),
];

test('matches application routes and excludes static assets', () => {
  for (const request of guardedRequests) {
    assert.equal(
      unstable_doesMiddlewareMatch({
        config,
        headers: Object.fromEntries(request.headers),
        url: request.url,
      }),
      true,
    );
  }

  for (const url of [
    'https://atemoya.test/_next/static/chunks/app.js',
    'https://atemoya.test/_next/image?url=%2Fatemoya-icon.svg',
    'https://atemoya.test/robots.txt',
    'https://atemoya.test/icons/favicon-32x32.png',
    'https://atemoya.test/atemoya-icon.svg',
  ]) {
    assert.equal(unstable_doesMiddlewareMatch({ config, url }), false);
  }
});

test('blocks matched requests only while maintenance is enabled', async () => {
  const previousMode = process.env.MAINTENANCE_MODE;

  try {
    process.env.MAINTENANCE_MODE = '0';

    const availableResponse = proxy(guardedRequests[0]);

    assert.equal(availableResponse.headers.get('x-middleware-next'), '1');

    process.env.MAINTENANCE_MODE = '1';

    await Promise.all(
      guardedRequests.map(async (request) => {
        const response = proxy(request);

        assert.equal(response.status, 503);
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
        assert.equal(response.headers.get('Content-Type'), 'text/plain; charset=utf-8');
        assert.equal(response.headers.get('Retry-After'), '60');
        assert.equal(await response.text(), 'Service Unavailable');
      }),
    );
  } finally {
    if (previousMode === undefined) {
      delete process.env.MAINTENANCE_MODE;
    } else {
      process.env.MAINTENANCE_MODE = previousMode;
    }
  }
});
