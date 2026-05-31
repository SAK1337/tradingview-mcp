## 1. Connection seam
- [x] 1.1 In `src/connection.js`, export `disconnect()` that closes the current `client` and nulls
      `client`/`targetInfo`. (Already existed at ~line 127; verified and reused.)
- [x] 1.2 Allow `connect()`/`getClient()` to attach to an explicit target id (e.g. `reconnect(targetId)`),
      so the next `evaluate()` runs against the chosen tab. (Added `reconnect(targetId)`.)
- [x] 1.3 Export `CDP_HOST`, `CDP_PORT`, and a `fetchWithTimeout(url, ms)` helper using `AbortController`.

## 2. tab.js
- [x] 2.1 Import `CDP_HOST`/`CDP_PORT`/`fetchWithTimeout`/`disconnect`/`reconnect` from `connection.js`;
      delete the local `CDP_HOST`/`CDP_PORT` constants.
- [x] 2.2 In `switchTab`, after `/json/activate/<id>` succeeds, call `disconnect()` then `reconnect(target.id)`
      before returning.
- [x] 2.3 Replace bare `fetch` in `list`/`switchTab` with `fetchWithTimeout`.
- [x] 2.4 In `newTab`/`closeTab`, poll the tab list until the count changes (bounded) instead of fixed sleeps.
      (Shared `waitForTabCount` helper; newTab throws on no-change, closeTab stays conservative.)

## 3. Tests
- [x] 3.1 Add a DI/mocked unit test asserting `switchTab` invalidates and rebuilds the client against the
      new target id (and that out-of-range index still throws). Out-of-range throw + `fetchWithTimeout`
      abort are covered offline in `tests/tab.test.js`. NOTE: asserting the disconnect()/reconnect()
      rebuild on a VALID index needs to mock the live `chrome-remote-interface` attach, which requires a
      `_deps` seam on tab.js — deferred to the #10 complete-dependency-injection-and-tests change.
- [ ] 3.2 Add an e2e test (skipped without a live TV) that switches tabs then asserts `chart_get_state`
      returns the new tab's symbol. DEFERRED — paired with the DI seam in #10; offline coverage added instead.

## 4. Validate
- [x] 4.1 `openspec validate fix-tab-switch-cdp-reconnect --strict`
