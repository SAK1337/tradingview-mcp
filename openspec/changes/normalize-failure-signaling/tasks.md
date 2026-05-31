## 1. Core failure contract
- [ ] 1.1 `src/core/data.js`: `getStrategyResults`/`getTrades`/`getEquity` throw when the underlying
      payload carries an error instead of returning `{success:true, error}`.
- [ ] 1.2 `src/core/batch.js`: unknown action throws (or records a per-iteration `success:false`); the
      overall batch result reflects per-item failures rather than blanket `success:true`.
- [ ] 1.3 `src/core/ui.js`: `layoutSwitch`/layout-list timeouts throw instead of returning in-band error.
- [ ] 1.4 `src/core/alerts.js`: `create()` throws "Could not find Create button in alert dialog" when
      `created` is falsy.

## 2. Preserve underlying errors
- [ ] 2.1 `src/core/data.js` `getOhlcv`: stop catching the evaluate error; only emit the
      "chart may still be loading" hint when extraction returned truthy-but-empty bars.
- [ ] 2.2 `buildGraphicsJS`/the four pine-graphics readers: collect per-study parse failures into a
      `_warnings` array on the result.

## 3. CLI exit code
- [ ] 3.1 `src/cli/router.js`: exit non-zero when `result.success === false`; keep existing
      connection-error classification for thrown errors.

## 4. alert_delete default
- [ ] 4.1 Default `delete_all:false`; return `{success:false, error:'Individual deletion not supported…'}`
      (no throw) when individual deletion is requested.

## 5. Tests
- [ ] 5.1 Unit tests: each touched core function throws (or returns success:false) on the failure path.
- [ ] 5.2 Unit test: pine-graphics reader surfaces `_warnings` when a mocked `_primitivesCollection`
      shape is undefined.
- [ ] 5.3 CLI test: a `success:false` handler result yields a non-zero exit code.

## 6. Validate
- [ ] 6.1 `openspec validate normalize-failure-signaling --strict`
