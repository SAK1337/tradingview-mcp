## 1. Share the extraction builders
- [ ] 1.1 In `src/core/data.js`, expose the page-side extraction strings as named builders (the
      `buildAllGraphicsJS`/`graphicsExtractSnippet` graphics path and the `getStudyValues`
      `_study.data()._items` values snippet) so other modules can reuse the exact JS.
- [ ] 1.2 Re-point `src/core/stream.js` `fetchValues` to the shared values builder (replacing
      `src._lastBarValues || src._data` at `:207-208`).
- [ ] 1.3 Re-point `fetchLines`/`fetchLabels`/`fetchTables` to the shared graphics builder (replacing the
      `line.points[0].price` / `pc.ownFirstValue()` / `table.data[r][c].text` shapes).

## 2. Bound the poll-loop error handling
- [ ] 2.1 In `pollLoop` (`src/core/stream.js:106-120`), apply the consecutive-error counter, backoff, and
      escalate-after-N to **all** caught errors, not just `/CDP|ECONNREFUSED/`.
- [ ] 2.2 Add a terminal bail-out (or escalation) after N consecutive non-transport errors so a moved
      API path cannot spin an unbounded log loop.

## 3. Tests
- [ ] 3.1 Using the stream functions' existing `_deps` seam (`streamValues`/`streamLines`/… at
      `src/core/stream.js:158-442`), add a unit test asserting they return data equivalent to `data.js`
      extraction for a fixed mock chart state (parity test). Thread `_deps` into the inner `fetch*`
      helpers if they don't already receive it.
- [ ] 3.2 Add a unit test for the poll loop asserting a persistent non-CDP error backs off and
      terminates instead of looping at the base interval.
- [ ] 3.3 Backfill the deferred `waitForChartReady`/`normalizeResolution` coverage (audit R4-3): assert
      `1D`==`D` normalization, the "only block on a positively-read different resolution" gate, and the
      timeout→`false` path. (Closes the readiness coverage gap left by `verify-chart-readiness`.)

## 4. Validate
- [ ] 4.1 `openspec validate converge-streaming-extraction --strict`
