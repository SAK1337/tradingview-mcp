## 1. Core — shared helper + REST create
- [x] 1.1 Factor a `pricealertsJS(path, payloadObj, query)` builder (`payload`-wrapped body, `text/plain`,
      `x-usenewauth: true`) and a `checkAlertOk(result, label)` (throw on `error`/non-`ok`). Refactor
      `deleteAlerts` to use them (via shared `alertIdsOperation`; dropped the bespoke `deleteAlertsJS`).
- [x] 1.2 Add `createViaRest({ condition, price, message, _deps })`: read `symbolInfo().currency_id` +
      `pro_name` + `window.user.username` from the chart (`KNOWN_PATHS.chartApi`); build
      `symbol = ={"currency-id":..,"symbol":..}`; map condition → `cross`/`cross_up`/`cross_down`;
      ~30-day `expiration`; POST `create_alert`; return `{ alert_id, condition, source:'pricealerts_api' }`.
      Throws if symbol info can't be resolved.
- [x] 1.3 Renamed the dialog `create()` body to `createViaDialog()`; `create()` tries REST first, falls
      back to the dialog; if both fail, throws a combined error.

## 2. Core — pause / resume
- [x] 2.1 Added `pauseAlerts` (`stop_alerts`) and `resumeAlerts` (`restart_alerts`) via the shared
      `alertIdsOperation` (id/array + `all` list-then-operate; throw on no-target / non-`ok`); return
      `{ success, paused_count|resumed_count, paused_ids|resumed_ids, source:'pricealerts_api' }`.

## 3. Tool + CLI surface
- [x] 3.1 `src/tools/alerts.js`: added `alert_pause` and `alert_resume` (`alert_ids` single/array + `all`).
- [x] 3.2 `src/cli/commands/alerts.js`: added `pause` and `resume` subcommands (`--id` csv, `--all`).

## 4. Tests (DI-mocked, offline)
- [x] 4.1 `create()` REST happy path: asserts `alert_id`, `source:'pricealerts_api'`, confirmed condition,
      and the create_alert POST carries the `currency-id` symbol + `cross_up` type + text/plain/x-usenewauth.
- [x] 4.2 `create()` falls back to the dialog when symbol ctx can't be resolved (source `applied`); a REST
      non-`ok` with no dialog deps surfaces the REST failure.
- [x] 4.3 `pauseAlerts`/`resumeAlerts`: by-id, array, `all` list-then-operate, no-target throw, non-`ok`
      throw. Existing `deleteAlerts` tests green after the shared-helper refactor.

## 5. Validate
- [x] 5.1 `openspec validate rest-alert-lifecycle --strict` → valid.
- [x] 5.2 Offline alert suite green; live REST `create` → `pause` (active:false) → `resume` (active:true)
      → `delete` round-trip restored the baseline alert count.
