## 1. Throw from the list functions on embedded error
- [ ] 1.1 In `src/core/alerts.js` `list()` (`:119`), if the page-side payload carries `error`, throw
      `new Error(result.error)` instead of returning `{ success: true, ..., error }`. Return the success
      shape without an `error` field on the happy path.
- [ ] 1.2 In `src/core/pine.js` `listScripts()` (`:678-684`), apply the same: throw on `scripts?.error`,
      return the success shape without an embedded `error`. Match the existing `openScript` pattern.

## 2. Throw from deleteAlerts unsupported branch
- [ ] 2.1 In `src/core/alerts.js` `deleteAlerts()`, replace the
      `return { success: false, error: 'Individual alert deletion not supported; pass delete_all:true' }`
      with `throw new Error('Individual alert deletion not supported; pass delete_all:true')` so
      `registerAlertTools` wraps it with the `isError` flag.

## 3. Tests
- [ ] 3.1 DI-mocked unit test: when the injected `evaluate` resolves a payload with `error`, `list()` and
      `listScripts()` throw (and the tool layer returns `{success:false}` with `isError`).
- [ ] 3.2 Unit test: `deleteAlerts({ delete_all:false })` throws rather than returning a success-shaped
      failure.

## 4. Validate
- [ ] 4.1 `openspec validate normalize-remaining-failure-signaling --strict`
