import { z } from 'zod';
import { jsonResult } from './_format.js';
import * as core from '../core/alerts.js';

export function registerAlertTools(server) {
  server.tool('alert_create', 'Create a price alert via the TradingView alert dialog', {
    condition: z.enum(['crossing', 'crossing_up', 'crossing_down']).describe('Alert condition. The TradingView alert dialog offers only these three for a price alert: "crossing", "crossing_up", "crossing_down".'),
    price: z.coerce.number().describe('Price level for the alert'),
    message: z.string().optional().describe('Alert message'),
  }, async ({ condition, price, message }) => {
    try { return jsonResult(await core.create({ condition, price, message })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('alert_list', 'List active alerts', {}, async () => {
    try { return jsonResult(await core.list()); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('alert_delete', 'Delete alerts by id (or all) via the pricealerts API', {
    alert_ids: z.union([z.coerce.number().int(), z.array(z.coerce.number().int())]).optional()
      .describe('Alert id or array of ids to delete (from alert_list). Omit and pass delete_all to clear all.'),
    delete_all: z.coerce.boolean().optional().describe('Delete every active alert'),
  }, async ({ alert_ids, delete_all }) => {
    try { return jsonResult(await core.deleteAlerts({ alert_ids, delete_all })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('alert_pause', 'Pause (deactivate) alerts by id (or all) via the pricealerts API', {
    alert_ids: z.union([z.coerce.number().int(), z.array(z.coerce.number().int())]).optional()
      .describe('Alert id or array of ids to pause (from alert_list). Omit and pass all to pause every alert.'),
    all: z.coerce.boolean().optional().describe('Pause every alert'),
  }, async ({ alert_ids, all }) => {
    try { return jsonResult(await core.pauseAlerts({ alert_ids, all })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('alert_resume', 'Resume (reactivate) alerts by id (or all) via the pricealerts API', {
    alert_ids: z.union([z.coerce.number().int(), z.array(z.coerce.number().int())]).optional()
      .describe('Alert id or array of ids to resume (from alert_list). Omit and pass all to resume every alert.'),
    all: z.coerce.boolean().optional().describe('Resume every alert'),
  }, async ({ alert_ids, all }) => {
    try { return jsonResult(await core.resumeAlerts({ alert_ids, all })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });
}
