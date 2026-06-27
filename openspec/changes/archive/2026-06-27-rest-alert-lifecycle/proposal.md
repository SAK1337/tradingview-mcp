# Change: REST-based alert lifecycle — create, pause, resume

## Why
The alert tools drive the DOM for creation and had no pause/resume at all. A live CDP Network capture of
the TradingView client recovered the full internal `pricealerts` REST surface (and the
`symbol`/`currency-id` construction), all validated end-to-end:

```
POST /create_alert   {"payload":{conditions:[{type,frequency,series:[{type:"barset"},{type:"value",value}],resolution}], symbol, resolution, message, expiration(~30d), notif flags, active, ignore_warnings}}
POST /stop_alerts    {"payload":{"alert_ids":[...]}}    (pause / deactivate)
POST /restart_alerts {"payload":{"alert_ids":[...]}}    (resume / reactivate)
```

`symbol` is `={"currency-id":<symbolInfo().currency_id>,"symbol":<symbolInfo().pro_name>}`, read from the
chart model. Requests use `text/plain;charset=UTF-8` + header `x-usenewauth: true` (same envelope as the
already-shipped `delete_alerts`). This lets alert creation skip the fragile dialog automation and adds the
missing pause/resume operations.

## What Changes
- `create()` SHALL create alerts via `POST /create_alert` (resolving `symbol`/`currency-id`/username from
  the page, a ~30-day expiration, and the requested `condition`→`cross`/`cross_up`/`cross_down` type),
  returning the created `alert_id`. The existing DOM dialog `create()` SHALL be retained as an automatic
  **fallback** when REST cannot run (e.g. symbol info unavailable), so creation still works if the
  endpoint shape drifts.
- New `pauseAlerts({ alert_ids, all })` SHALL deactivate alerts via `POST /stop_alerts`; new
  `resumeAlerts({ alert_ids, all })` SHALL reactivate via `POST /restart_alerts`. Both accept a single id
  or an array, support `all` (list-then-operate), and THROW when no target is given or the API returns a
  non-`ok` status.
- New `alert_pause` / `alert_resume` MCP tools and `tv alert pause|resume --id|--all` CLI subcommands.
- The shared page-side POST builder (`payload`-wrapped, `text/plain`, `x-usenewauth`) SHALL be factored so
  delete/stop/restart/create use one helper.

## Out of scope
- `modify_restart_alert` (edit): captured (= create payload + `alert_id` + `client_id`) but deferred —
  delete+recreate covers the need for now.

## Impact
- Affected specs: `alert-management` (ADDED: REST create, pause, resume).
- Affected code: `src/core/alerts.js` (create REST path + fallback, pauseAlerts, resumeAlerts, shared
  helper), `src/tools/alerts.js`, `src/cli/commands/alerts.js`, `tests/alerts.test.js`.
- Builds on `rest-alert-deletion` (same envelope/helper). The dialog `create()` from
  `apply-alert-condition` becomes the fallback path.
