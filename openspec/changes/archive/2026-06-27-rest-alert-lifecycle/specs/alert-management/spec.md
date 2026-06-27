## ADDED Requirements

### Requirement: Create alerts via the pricealerts API
`create()` SHALL create alerts through `POST https://pricealerts.tradingview.com/create_alert` using a
`text/plain` `{"payload":{...}}` body, building the `symbol` field as
`={"currency-id":<symbolInfo().currency_id>,"symbol":<symbolInfo().pro_name>}` from the chart model and
mapping the requested `condition` to the `cross` / `cross_up` / `cross_down` series type. It SHALL return
the created `alert_id`. When the REST path cannot run (e.g. the chart symbol cannot be resolved) or fails,
`create()` SHALL fall back to the DOM dialog creation path so alert creation still succeeds.

#### Scenario: Create via REST
- **WHEN** `create({ condition: "crossing_up", price })` is called and the chart symbol resolves
- **THEN** the alert is created via the REST API and the result reports `alert_id` and the confirmed condition

#### Scenario: Fallback to the dialog
- **WHEN** the REST create cannot run or returns a non-`ok` status
- **THEN** `create()` falls back to the DOM dialog path rather than failing outright

### Requirement: Pause and resume alerts
`pauseAlerts({ alert_ids, all })` SHALL deactivate alerts via `POST /stop_alerts` and
`resumeAlerts({ alert_ids, all })` SHALL reactivate them via `POST /restart_alerts`, both using the
`{"payload":{"alert_ids":[...]}}` body. Each accepts a single id or an array, supports `all`
(list-then-operate), and SHALL THROW when neither `alert_ids` nor `all` is supplied or when the API
returns a non-`ok` status.

#### Scenario: Pause specific alerts
- **WHEN** `pauseAlerts({ alert_ids: [id1, id2] })` is called
- **THEN** those alerts are deactivated via `stop_alerts` and the result reports the affected ids

#### Scenario: Resume specific alerts
- **WHEN** `resumeAlerts({ alert_ids: id })` is called
- **THEN** that alert is reactivated via `restart_alerts`

#### Scenario: No target
- **WHEN** `pauseAlerts({})` or `resumeAlerts({})` is called with no `alert_ids` and no `all`
- **THEN** it throws an `Error` explaining an id or `all` is required

#### Scenario: API failure
- **WHEN** the pricealerts API returns a non-`ok` status
- **THEN** the operation throws an `Error` carrying the failure instead of reporting success
