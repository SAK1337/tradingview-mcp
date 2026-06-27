/**
 * Offline failure-path unit tests for src/core/alerts.js via the `_deps`
 * injection seam. No live TradingView required.
 *
 * Covers:
 *   - create() THROWS when the dialog's Create button can't be found
 *     (the final evaluate resolves falsy) — the normalized failure contract.
 *   - create() succeeds when every page-side step resolves truthy.
 *   - deleteAlerts() THROWS when delete_all is omitted (normalize-remaining-
 *     failure-signaling — so the tool wrapper sets the MCP isError flag).
 *   - list() THROWS on a page-side error instead of returning success-with-error.
 *
 * Run: node --test tests/alerts.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { create, deleteAlerts, list } from '../src/core/alerts.js';

// A scripted evaluate that classifies each page-side expression the rewritten
// create() issues and returns a canned result, plus a fake CDP client that
// records mouse/key input. This lets us exercise the open -> apply-condition ->
// verify -> price -> Create flow entirely offline, and simulate each failure
// (dialog won't open, condition control missing, option not offered, read-back
// mismatch, Create button missing) by flipping one flag.
function scriptedDeps({
  paneFound = true,
  dialogOpens = true,
  rowFound = true,
  optionFound = true,
  readback = 'Crossing',
  priceSet = true,
  createFound = true,
} = {}) {
  const calls = [];
  const mouse = [];
  const keys = [];
  const evaluate = async (expr) => {
    calls.push(expr);
    if (/chart-gui-wrapper|chart-markup-table|canvas/.test(expr)) return paneFound ? { x: 50, y: 50 } : null;
    if (/Add alert on/.test(expr)) return { x: 60, y: 60 };
    if (/!!document\.querySelector/.test(expr)) return dialogOpens;                       // dialog-present probe
    if (/operatorRow/.test(expr) && /getBoundingClientRect/.test(expr)) return rowFound ? { x: 70, y: 70 } : null;
    if (/\[role="option"\]/.test(expr)) return optionFound ? { x: 80, y: 80 } : null;     // option lookup by label
    if (/operatorRow/.test(expr) && /textContent/.test(expr)) return readback;            // condition read-back
    if (/HTMLInputElement\.prototype/.test(expr)) return priceSet;
    if (/HTMLTextAreaElement/.test(expr)) return undefined;
    if (/\^create\$/.test(expr)) return createFound ? { x: 90, y: 90 } : null;            // Create button rect
    return undefined;
  };
  const fakeClient = {
    Input: {
      dispatchMouseEvent: async (e) => { if (e.type === 'mousePressed') mouse.push(e); },
      dispatchKeyEvent: async (e) => { keys.push(e); },
    },
  };
  return { _deps: { evaluate, getClient: async () => fakeClient }, calls, mouse, keys };
}

describe('alerts.create — applies and verifies the condition', () => {
  it('selects the requested condition and reports the read-back, not a blind echo', async () => {
    const { _deps, calls } = scriptedDeps({ readback: 'Crossing' });
    const r = await create({ condition: 'crossing', price: 100, message: 'hi', _deps });
    assert.equal(r.success, true);
    assert.equal(r.price, 100);
    assert.equal(r.condition_requested, 'crossing');   // what was asked
    assert.equal(r.condition, 'Crossing');             // what the dialog confirmed
    assert.equal(r.source, 'applied');
    assert.equal(r.price_set, true);
    // proves a condition-selection step actually ran (option lookup by label)
    assert.ok(calls.some(c => /\[role="option"\]/.test(c)), 'issued the condition-select evaluate');
  });

  it('maps each enum value to the matching dialog label on read-back', async () => {
    const { _deps } = scriptedDeps({ readback: 'Crossing Down' });
    const r = await create({ condition: 'crossing_down', price: 5, _deps });
    assert.equal(r.condition_requested, 'crossing_down');
    assert.equal(r.condition, 'Crossing Down');
  });

  it('throws when the condition control is not in the dialog', async () => {
    const { _deps } = scriptedDeps({ rowFound: false });
    await assert.rejects(
      () => create({ condition: 'crossing', price: 1, _deps }),
      /condition control not found/,
    );
  });

  it('throws when the requested option is not offered by this build', async () => {
    const { _deps } = scriptedDeps({ optionFound: false });
    await assert.rejects(
      () => create({ condition: 'crossing_up', price: 1, _deps }),
      /not offered by this TradingView build/,
    );
  });

  it('throws when the read-back does not match the requested condition', async () => {
    // requested crossing (label "Crossing") but the dialog reports "Crossing Up"
    const { _deps } = scriptedDeps({ readback: 'Crossing Up' });
    await assert.rejects(
      () => create({ condition: 'crossing', price: 1, _deps }),
      /Alert condition not applied/,
    );
  });

  it('throws when the Create button is not found (after the condition is applied)', async () => {
    const { _deps } = scriptedDeps({ createFound: false });
    await assert.rejects(
      () => create({ condition: 'crossing', price: 100, _deps }),
      /Could not find Create button/,
    );
  });

  it('throws when the dialog never opens', async () => {
    const { _deps } = scriptedDeps({ dialogOpens: false });
    await assert.rejects(
      () => create({ condition: 'crossing', price: 1, _deps }),
      /Could not open the alert dialog/,
    );
  });
});

describe('alerts.deleteAlerts — throws for missing delete_all', () => {
  it('throws (so the tool sets isError) when delete_all omitted', async () => {
    // No evaluate should be reached on this path, but provide one to be safe.
    await assert.rejects(
      () => deleteAlerts({ _deps: { evaluate: async () => ({}) } }),
      /Individual alert deletion not supported; pass delete_all:true/,
    );
  });

  it('returns success:true and reports the context-menu state when delete_all set', async () => {
    const _deps = { evaluate: async () => ({ context_menu_opened: true }) };
    const r = await deleteAlerts({ delete_all: true, _deps });
    assert.equal(r.success, true);
    assert.equal(r.context_menu_opened, true);
  });
});

describe('alerts.list — throws instead of success-with-error', () => {
  it('throws when the page payload carries an error', async () => {
    const _deps = { evaluateAsync: async () => ({ alerts: [], error: 'list_alerts failed: 503' }) };
    await assert.rejects(() => list({ _deps }), /list_alerts failed: 503/);
  });

  it('returns the success shape with no error field on the happy path', async () => {
    const _deps = { evaluateAsync: async () => ({ alerts: [{ alert_id: 1 }, { alert_id: 2 }] }) };
    const r = await list({ _deps });
    assert.equal(r.success, true);
    assert.equal(r.alert_count, 2);
    assert.ok(!('error' in r), 'no embedded error field on success');
  });
});
