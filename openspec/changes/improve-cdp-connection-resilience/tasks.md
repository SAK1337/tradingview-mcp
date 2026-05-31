## 1. Bounded discovery
- [ ] 1.1 Add `fetchWithTimeout(url, ms)` (AbortController) to `connection.js`; use it in
      `findChartTarget()` with a ~5s deadline.

## 2. evaluate retry + probe throttle
- [ ] 2.1 Wrap `c.Runtime.evaluate` so a connection-reset error nulls the singleton, reconnects, and
      retries once before throwing.
- [ ] 2.2 Throttle the `getClient()` liveness probe via a `lastProbeAt` timestamp (skip within ~1s).
- [ ] 2.3 Bound total connection wait (~10s) rather than only per-attempt (30s) backoff.

## 3. Stream output + backoff
- [ ] 3.1 Route stream output through an injectable sink; guard so nothing writes to stdout/stderr on the
      MCP path.
- [ ] 3.2 Replace the fixed 2s silent retry with exponential backoff (cap ~30s).
- [ ] 3.3 After N consecutive CDP failures, emit one error event/line (CLI may exit non-zero).

## 4. Tests
- [ ] 4.1 Unit test: `evaluate` retries once on a simulated `Target closed` then succeeds.
- [ ] 4.2 Unit test: discovery aborts when `/json/list` never resolves within the deadline.

## 5. Validate
- [ ] 5.1 `openspec validate improve-cdp-connection-resilience --strict`
