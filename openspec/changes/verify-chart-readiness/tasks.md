## 1. waitForChartReady
- [ ] 1.1 Read the current chart resolution inside the poll loop and require it to match `expectedTf`
      (when provided) as part of the ready condition.
- [ ] 1.2 Scope the bar-count probe to the chart canvas container (e.g. a `data-name` pane selector)
      instead of `[class*="bar"]`.
- [ ] 1.3 Fix/remove the misleading timeout comment so it matches the `false` return.

## 2. Treat timeout as failure for mutations
- [ ] 2.1 `chart.setSymbol`/`setTimeframe`: when readiness times out, return `success:false` with an
      explanatory error (not `success:true, chart_ready:false`).
- [ ] 2.2 `batch_run`: pass the requested timeframe into the readiness check and mark that iteration
      `success:false` on timeout.

## 3. Poll instead of fixed wait
- [ ] 3.1 Replace the 1500ms post-`createStudy` sleep with a bounded poll until `getAllStudies().length`
      increases (or a max elapsed).

## 4. Tests
- [ ] 4.1 Unit test (mocked deps): readiness fails when resolution never matches `expectedTf`.
- [ ] 4.2 Unit test: `setTimeframe` returns `success:false` on readiness timeout.

## 5. Validate
- [ ] 5.1 `openspec validate verify-chart-readiness --strict`
