/**
 * Router / failure-signaling unit tests — no TradingView connection needed.
 * Covers the CLI exit-code decision and the data.js findStrategy snippet builder.
 *
 * Run: node --test tests/router.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { exitCodeFor } from '../src/cli/router.js';
import { findStrategy } from '../src/core/data.js';

describe('CLI — exitCodeFor', () => {
  it('returns 1 for an explicit success:false result', () => {
    assert.equal(exitCodeFor({ success: false, error: 'boom' }), 1);
  });

  it('returns 0 for a success:true result', () => {
    assert.equal(exitCodeFor({ success: true, data: [] }), 0);
  });

  it('returns 0 when success is absent (non-failure object)', () => {
    assert.equal(exitCodeFor({ foo: 'bar' }), 0);
  });

  it('returns 0 for null / non-object results', () => {
    assert.equal(exitCodeFor(null), 0);
    assert.equal(exitCodeFor(undefined), 0);
    assert.equal(exitCodeFor('done'), 0);
  });
});

describe('data — findStrategy snippet builder', () => {
  it('returns a non-empty snippet embedding the predicate', () => {
    const snippet = findStrategy('s.reportData || s.performance');
    assert.equal(typeof snippet, 'string');
    assert.ok(snippet.length > 0);
    assert.ok(snippet.includes('s.reportData || s.performance'));
    assert.ok(snippet.includes('var strat = null'));
    assert.ok(snippet.includes('dataSources()'));
  });
});
