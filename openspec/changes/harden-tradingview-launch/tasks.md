## 1. Non-destructive default
- [ ] 1.1 Default `kill_existing` to `false` in the core and the tool schema; update the description.
- [ ] 1.2 If the CDP port already responds and `kill_existing` is false, skip launch and return an
      "already running" result with the restart hint.

## 2. Targeted kill
- [ ] 2.1 When restarting, track the spawned PID and kill only that PID (no `taskkill /IM`/broad `pkill`).

## 3. Spawn error handling
- [ ] 3.1 Attach an `'error'` listener to the child before `unref()`; cache the error and include it in
      the CDP-timeout response.

## 4. Tests
- [ ] 4.1 Unit test (mocked): with the port responding and `kill_existing:false`, no kill is issued.
- [ ] 4.2 Unit test: a simulated spawn error is surfaced in the result.

## 5. Validate
- [ ] 5.1 `openspec validate harden-tradingview-launch --strict`
