/**
 * Offline unit tests for the generic pollUntil() helper in src/wait.js.
 *
 * pollUntil(predicate, { interval, timeout }) polls predicate() (possibly async)
 * until it returns truthy or the timeout elapses. Resolves to the truthy value on
 * success, or null on timeout. Tiny intervals/timeouts keep these tests fast.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pollUntil } from '../src/wait.js';

test('pollUntil resolves with the truthy value once the predicate becomes true', async () => {
  let calls = 0;
  const result = await pollUntil(() => {
    calls += 1;
    return calls >= 3 ? `ready-${calls}` : false;
  }, { interval: 5, timeout: 200 });
  assert.equal(result, 'ready-3');
  assert.ok(calls >= 3);
});

test('pollUntil returns the truthy value immediately when predicate is already true', async () => {
  let calls = 0;
  const result = await pollUntil(() => { calls += 1; return 42; }, { interval: 5, timeout: 50 });
  assert.equal(result, 42);
  assert.equal(calls, 1);
});

test('pollUntil returns null on timeout when predicate never becomes truthy', async () => {
  const result = await pollUntil(() => false, { interval: 5, timeout: 50 });
  assert.equal(result, null);
});

test('pollUntil supports async predicates', async () => {
  let calls = 0;
  const result = await pollUntil(async () => {
    calls += 1;
    return calls >= 2 ? 'async-ok' : null;
  }, { interval: 5, timeout: 200 });
  assert.equal(result, 'async-ok');
});

test('pollUntil uses default options when none are provided', async () => {
  // With defaults (interval 200, timeout 10000) the first immediate truthy hit
  // returns without waiting a full interval.
  const result = await pollUntil(() => 'default-ok');
  assert.equal(result, 'default-ok');
});
