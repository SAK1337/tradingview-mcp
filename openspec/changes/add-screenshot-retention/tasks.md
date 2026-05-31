## 1. Retention
- [ ] 1.1 Add a retention helper that prunes `screenshots/` by age/count/total-bytes; call it on capture.
- [ ] 1.2 Expose retention/persistence options on the capture and batch tool schemas (sensible defaults).

## 2. Capture I/O
- [ ] 2.1 Decode the base64 PNG once; reuse the buffer for `writeFile` and `size_bytes`.
- [ ] 2.2 Replace `writeFileSync` with `await writeFile` (`fs/promises`) in `capture.js` and `batch.js`.
- [ ] 2.3 Sanitize filenames with `path.basename` + an allowlist (alphanumeric/`-`/`_`).
- [ ] 2.4 Move `mkdirSync(SCREENSHOT_DIR,…)` before the batch loop.

## 3. Tests
- [ ] 3.1 Unit test: a `..`-containing filename writes inside `screenshots/`, not outside.
- [ ] 3.2 Unit test: retention prunes beyond the configured cap.

## 4. Validate
- [ ] 4.1 `openspec validate add-screenshot-retention --strict`
