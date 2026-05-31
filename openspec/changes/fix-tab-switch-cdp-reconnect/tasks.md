## 1. Connection seam
- [ ] 1.1 In `src/connection.js`, export `disconnect()` that closes the current `client` and nulls
      `client`/`targetInfo`.
- [ ] 1.2 Allow `connect()`/`getClient()` to attach to an explicit target id (e.g. `reconnect(targetId)`),
      so the next `evaluate()` runs against the chosen tab.
- [ ] 1.3 Export `CDP_HOST`, `CDP_PORT`, and a `fetchWithTimeout(url, ms)` helper using `AbortController`.

## 2. tab.js
- [ ] 2.1 Import `CDP_HOST`/`CDP_PORT`/`fetchWithTimeout`/`disconnect`/`reconnect` from `connection.js`;
      delete the local `CDP_HOST`/`CDP_PORT` constants.
- [ ] 2.2 In `switchTab`, after `/json/activate/<id>` succeeds, call `disconnect()` then `reconnect(target.id)`
      before returning.
- [ ] 2.3 Replace bare `fetch` in `list`/`switchTab` with `fetchWithTimeout`.
- [ ] 2.4 In `newTab`/`closeTab`, poll the tab list until the count changes (bounded) instead of fixed sleeps.

## 3. Tests
- [ ] 3.1 Add a DI/mocked unit test asserting `switchTab` invalidates and rebuilds the client against the
      new target id (and that out-of-range index still throws).
- [ ] 3.2 Add an e2e test (skipped without a live TV) that switches tabs then asserts `chart_get_state`
      returns the new tab's symbol.

## 4. Validate
- [ ] 4.1 `openspec validate fix-tab-switch-cdp-reconnect --strict`
