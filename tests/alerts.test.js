/**
 * Offline failure-path unit tests for src/core/alerts.js via the `_deps`
 * injection seam. No live TradingView required.
 *
 * Covers:
 *   - create() THROWS when the dialog's Create button can't be found
 *     (the final evaluate resolves falsy) — the normalized failure contract.
 *   - create() succeeds when every page-side step resolves truthy.
 *   - deleteAlerts() returns { success: false } (does NOT throw) when
 *     delete_all is omitted.
 *
 * Run: node --test tests/alerts.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { create, deleteAlerts } from '../src/core/alerts.js';

// A scripted evaluate: classifies each call by the page expression and returns
// the matching canned value. Lets us simulate "Create button missing" by
// returning false for the final create-click expression.
function scriptedDeps({ opened = true, priceSet = true, created = true } = {}) {
  const calls = [];
  const evaluate = async (expr) => {
    calls.push(expr);
    // Open-dialog probe: looks for the "Create Alert" / alerts button.
    if (/Create Alert|data-name="alerts"/.test(expr) && /\.click\(\); return true/.test(expr)) return opened;
    // Price field population.
    if (/HTMLInputElement\.prototype/.test(expr)) return priceSet;
    // Final "Create" submit button.
    if (/\^create\$/i.test(expr) || /\/\^create\$\/i/.test(expr)) return created;
    return undefined;
  };
  // getClient is only reached if `opened` is falsy (keyboard fallback path).
  const fakeClient = {
    Input: { dispatchKeyEvent: async () => {} },
  };
  return { _deps: { evaluate, getClient: async () => fakeClient }, calls };
}

describe('alerts.create — failure contract', () => {
  it('throws when the Create button is not found (created falsy)', async () => {
    const { _deps } = scriptedDeps({ opened: true, priceSet: true, created: false });
    await assert.rejects(
      () => create({ condition: 'crossing', price: 100, _deps }),
      /Could not find Create button/,
    );
  });

  it('succeeds when all page steps resolve truthy', async () => {
    const { _deps } = scriptedDeps({ opened: true, priceSet: true, created: true });
    const r = await create({ condition: 'greater_than', price: 250.5, message: 'hi', _deps });
    assert.equal(r.success, true);
    assert.equal(r.price, 250.5);
    assert.equal(r.condition, 'greater_than');
    assert.equal(r.price_set, true);
  });

  it('still uses the keyboard fallback (getClient) when open probe is falsy', async () => {
    // opened=false drives the getClient keyboard path; created=true so it
    // ultimately succeeds — asserting the fallback branch doesn't crash.
    const { _deps } = scriptedDeps({ opened: false, priceSet: true, created: true });
    const r = await create({ condition: 'crossing', price: 1, _deps });
    assert.equal(r.success, true);
  });
});

describe('alerts.deleteAlerts — no-throw failure for missing delete_all', () => {
  it('returns { success: false } without throwing when delete_all omitted', async () => {
    // No evaluate should be needed on this path, but provide one to be safe.
    const r = await deleteAlerts({ _deps: { evaluate: async () => ({}) } });
    assert.equal(r.success, false);
    assert.match(r.error, /pass delete_all:true/);
  });

  it('returns success:true and reports the context-menu state when delete_all set', async () => {
    const _deps = { evaluate: async () => ({ context_menu_opened: true }) };
    const r = await deleteAlerts({ delete_all: true, _deps });
    assert.equal(r.success, true);
    assert.equal(r.context_menu_opened, true);
  });
});
