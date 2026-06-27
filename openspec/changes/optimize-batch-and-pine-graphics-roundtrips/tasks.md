## 1. Expose the one-round-trip pine-graphics tool
- [ ] 1.1 Register a `data_get_pine_graphics` MCP tool in `src/tools/data.js` that calls
      `core.getAllGraphicsShaped({ study_filter, max_labels, verbose })` and returns the combined
      `{ lines, labels, tables, boxes }` in a single response.
- [ ] 1.2 Add the matching CLI command so the report pipeline can fetch all four types in one call.
- [ ] 1.3 (Optional) Document in CLAUDE.md that the combined tool is preferred for the full-report pass;
      keep the four per-type tools for targeted reads.

## 2. Cheapen batch get_ohlcv
- [ ] 2.1 In `src/core/batch.js` `get_ohlcv` action, replace the `exportData({includeSeries:true})` call
      with a tail read via `bars.valueAt(i)` from `lastIndex()-limit+1` to `lastIndex()`, mirroring
      `getOhlcv()` in `src/core/data.js:200-213`. Keep the `{ bar_count, last_bar }` result shape.

## 3. Tests
- [ ] 3.1 Unit test (DI-mocked `evaluate`) asserting `data_get_pine_graphics` issues ONE evaluate and
      returns all four primitive slices.
- [ ] 3.2 Unit test asserting the batch `get_ohlcv` path uses the tail-read builder (one bounded read),
      not a full `exportData`.

## 4. Validate
- [ ] 4.1 `openspec validate optimize-batch-and-pine-graphics-roundtrips --strict`
