## 1. Canonical paths
- [ ] 1.1 Import `KNOWN_PATHS` and use `KNOWN_PATHS.chartApi` in `chart.js`, `indicators.js`, `stream.js`;
      delete the local `CHART_API` literals.

## 2. Named timing constants
- [ ] 2.1 Replace magic-number `setTimeout` delays with named module constants + a rationale comment each
      (chart, pine, ui, alerts, pane, tab, batch, replay).

## 3. Shared helpers
- [ ] 3.1 Add `pollUntil(predicate, {interval, timeout})` to `wait.js`; refactor `waitForChartReady` and
      the pine-editor poll to use it.
- [ ] 3.2 Extract `findCompileButton()` (pine), `findStrategy()` (data), `findBarIndexRange()` (chart).
- [ ] 3.3 Add `wrap(fn)` to `_format.js`; adopt it in a few tool registrars (pattern).

## 4. Single source of truth + config
- [ ] 4.1 Derive/align the tool count across `server.js`, `cli/index.js`, `CLAUDE.md`.
- [ ] 4.2 Add a `PINE_FACADE_URL` env override (default to the current hardcoded URL).
- [ ] 4.3 Add `engines.node >=18` to `package.json`.
- [ ] 4.4 `replay_stop` calls `hideReplayToolbar()` before returning.

## 5. Validate
- [ ] 5.1 `openspec validate consolidate-shared-constants-and-timing --strict`
