## 1. Wire orphaned suites (do first — cheap, high value)
- [ ] 1.1 Add `tests/sanitization.test.js` and `tests/replay.test.js` to `test`, `test:unit`, `test:all`
      in `package.json`.
- [ ] 1.2 Run `npm run test:all`; fix or quarantine (with a tracked note) any newly-surfaced failure.

## 2. DI rollout (by priority)
- [ ] 2.1 `data.js` — add `_resolve(deps)`; route `evaluate`/`evaluateAsync` through it.
- [ ] 2.2 `pine.js`, `indicators.js`, `ui.js`.
- [ ] 2.3 `alerts.js`, `batch.js`, `watchlist.js`, `capture.js`, `tab.js`, `pane.js`, `health.js`,
      `stream.js`.

## 3. New unit suites (failure paths)
- [ ] 3.1 `data.js`: `_warnings` surfaced on broken graphics shape; `getOhlcv` propagates eval error.
- [ ] 3.2 `alerts.js`: `create` throws when Create button missing.
- [ ] 3.3 `tab.js`: `switchTab` reconnect.
- [ ] 3.4 `ui.js`: selector sanitization + keyboard mapping.

## 4. Validate
- [ ] 4.1 `openspec validate complete-dependency-injection-and-tests --strict`
