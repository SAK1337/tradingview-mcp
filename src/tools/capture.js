import { z } from 'zod';
import { jsonResult } from './_format.js';
import * as core from '../core/capture.js';

export function registerCaptureTools(server) {
  server.tool('capture_screenshot', 'Take a screenshot of the TradingView chart', {
    region: z.enum(['full', 'chart', 'strategy_tester']).optional().describe('Region to capture: full, chart, strategy_tester (default full)'),
    filename: z.string().optional().describe('Custom filename (without extension)'),
    method: z.enum(['cdp', 'api']).optional().describe('Capture method: cdp (Page.captureScreenshot) or api (chartWidgetCollection.takeScreenshot) (default cdp)'),
  }, async ({ region, filename, method }) => {
    try { return jsonResult(await core.captureScreenshot({ region, filename, method })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });
}
