/**
 * Offline unit tests for tab management + the connection fetch helper.
 *
 * tab.js imports its connection seam (CDP_HOST/PORT, fetchWithTimeout,
 * disconnect, reconnect) DIRECTLY from connection.js — it has no `_deps`
 * injection seam yet. So these tests cover what is deterministic offline by
 * stubbing the global `fetch`:
 *   - fetchWithTimeout aborts a non-resolving fetch within its deadline.
 *   - switchTab throws on an out-of-range index (list() resolves from a stubbed
 *     /json/list, so the throw happens before any CDP reconnect is attempted).
 *
 * DEFERRED to the #10 complete-dependency-injection-and-tests change:
 *   - Asserting switchTab actually calls disconnect()/reconnect(target.id) on a
 *     valid index requires mocking the live CDP attach (chrome-remote-interface),
 *     which needs a DI seam on tab.js. The e2e variant (skipped without a live
 *     TradingView) is the other half of tasks.md 3.2.
 *
 * Run: node --test tests/tab.test.js
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithTimeout } from '../src/connection.js';
import { switchTab } from '../src/core/tab.js';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('fetchWithTimeout', () => {
  it('aborts a non-resolving fetch within the deadline', async () => {
    // A fetch that respects the AbortSignal but otherwise never resolves.
    globalThis.fetch = (url, opts = {}) =>
      new Promise((_resolve, reject) => {
        const signal = opts.signal;
        if (signal) {
          signal.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });

    const started = Date.now();
    await assert.rejects(
      () => fetchWithTimeout('http://localhost:9222/json/list', 50),
      (err) => err.name === 'AbortError' || /abort/i.test(err.message),
    );
    // Should have aborted near the deadline, not hung for seconds.
    assert.ok(Date.now() - started < 2000, 'fetchWithTimeout should abort promptly');
  });

  it('passes through a successful fetch before the deadline', async () => {
    globalThis.fetch = async () => ({ ok: true, async json() { return []; } });
    const resp = await fetchWithTimeout('http://localhost:9222/json/list', 1000);
    assert.equal(resp.ok, true);
    assert.deepEqual(await resp.json(), []);
  });
});

describe('switchTab — index validation', () => {
  function stubTargets(n) {
    // Build a /json/list response with n tradingview chart page targets.
    const targets = Array.from({ length: n }, (_, i) => ({
      type: 'page',
      id: `TARGET-${i}`,
      title: `Live stock charts on chart ${i}`,
      url: `https://www.tradingview.com/chart/abc${i}/`,
    }));
    globalThis.fetch = async (url) => {
      if (String(url).includes('/json/list')) {
        return { async json() { return targets; } };
      }
      // /json/activate should not be reached for an out-of-range index.
      throw new Error(`unexpected fetch to ${url}`);
    };
  }

  it('throws on an index >= the number of open tabs', async () => {
    stubTargets(2); // valid indices: 0, 1
    await assert.rejects(
      () => switchTab({ index: 2 }),
      /out of range/i,
    );
  });

  it('throws on an index past the end without touching activate/reconnect', async () => {
    stubTargets(1);
    await assert.rejects(
      () => switchTab({ index: 5 }),
      /out of range \(have 1 tabs\)/i,
    );
  });
});
