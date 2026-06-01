/**
 * Core streaming logic — real-time JSONL output from TradingView.
 * Uses efficient poll + dedup: only emits when data changes.
 */
import { evaluate, KNOWN_PATHS } from '../connection.js';

const CHART_API = KNOWN_PATHS.chartApi;
const MODEL = `${CHART_API}._chartWidget.model()`;

// Backoff / escalation tuning for repeated CDP errors.
const ERROR_BACKOFF_BASE = 1000;   // first retry delay
const ERROR_BACKOFF_CAP = 30000;   // max retry delay
const ERROR_ESCALATE_AFTER = 10;   // consecutive failures before we surface one error

/**
 * A no-op sink: when a stream is invoked WITHOUT an explicit sink (e.g. from the
 * MCP stdio path) nothing is written to the process stdio streams, which would
 * otherwise corrupt the MCP protocol.
 */
const NOOP_SINK = { out() {}, err() {} };

/**
 * Cheap default dedup fingerprint. For a plain object it joins the top-level
 * primitive values plus the key count — far cheaper than serializing the whole
 * (often nested) payload, and good enough to detect "nothing changed" for the
 * shallow streams. Arrays/objects nested inside are summarized by type+length
 * so a structural change still flips the fingerprint; for variable-shape
 * payloads callers pass a purpose-built fingerprint() instead.
 */
export function shallowFingerprint(data) {
  if (data == null) return 'null';
  if (typeof data !== 'object') return String(data);
  if (Array.isArray(data)) return 'arr:' + data.length;
  const keys = Object.keys(data);
  let parts = 'n=' + keys.length;
  for (const k of keys) {
    const v = data[k];
    if (v == null) parts += '|' + k + '=∅';
    else if (typeof v === 'object') parts += '|' + k + '=' + (Array.isArray(v) ? 'arr' + v.length : 'obj' + Object.keys(v).length);
    else parts += '|' + k + '=' + v;
  }
  return parts;
}

/**
 * Resolves the fingerprint function for a stream: an explicit per-stream
 * fingerprint wins; otherwise the shallow default. Exported for testing.
 */
export function fingerprintFor(fn) {
  return typeof fn === 'function' ? fn : shallowFingerprint;
}

/**
 * Generic poll-and-diff loop.
 * Calls fetcher(), compares to last value, emits JSONL on change.
 *
 * Output is routed exclusively through the injected `sink` ({ out, err }). When no
 * sink is provided it defaults to NOOP_SINK so the function is safe to call off the
 * CLI path (e.g. the MCP stdio transport). The CLI consumer passes writers backed
 * by process.stdout/stderr to preserve the pipe-friendly JSONL behaviour.
 *
 * Dedup uses a cheap per-stream `fingerprint(data) => string` (defaults to a
 * shallow fingerprint) instead of re-serializing the whole payload every cycle.
 * The emitted JSONL line is serialized exactly once, on emit.
 */
async function pollLoop(fetcher, { interval = 500, dedupe = true, label = 'stream', sink, fingerprint } = {}) {
  const out = sink?.out ?? NOOP_SINK.out;
  const err = sink?.err ?? NOOP_SINK.err;
  const fp = fingerprintFor(fingerprint);
  let lastHash = null;
  let running = true;

  const cleanup = () => { running = false; };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Emit header with compliance notice
  const start = Date.now();
  err(`\u26A0  tradingview-mcp  |  Unofficial tool. Not affiliated with TradingView Inc. or Anthropic.\n`);
  err(`   Streams from your locally running TradingView Desktop instance only.\n`);
  err(`   Does not connect to TradingView servers. Requires --remote-debugging-port=9222.\n`);
  err(`   Ensure your usage complies with TradingView's Terms of Use.\n`);
  err(`[stream:${label}] started, interval=${interval}ms, Ctrl+C to stop\n`);

  let consecutiveErrors = 0;
  let escalated = false;

  while (running) {
    try {
      const data = await fetcher();
      consecutiveErrors = 0;
      escalated = false;
      if (!data) { await sleep(interval); continue; }

      const hash = dedupe ? fp(data) : null;
      if (!dedupe || hash !== lastHash) {
        lastHash = hash;
        // Single serialization on emit (no second stringify for the dedup hash).
        const line = JSON.stringify({ ...data, _ts: Date.now(), _stream: label });
        out(line + '\n');
      }
    } catch (e) {
      // Connection errors — back off exponentially instead of retrying silently forever.
      if (/CDP|ECONNREFUSED/i.test(e.message)) {
        consecutiveErrors++;
        if (consecutiveErrors >= ERROR_ESCALATE_AFTER && !escalated) {
          escalated = true;
          err(`[stream:${label}] CDP unavailable after ${consecutiveErrors} consecutive attempts: ${e.message}\n`);
        }
        const delay = Math.min(ERROR_BACKOFF_BASE * Math.pow(2, consecutiveErrors - 1), ERROR_BACKOFF_CAP);
        await sleep(delay);
        continue;
      }
      err(`[stream:${label}] error: ${e.message}\n`);
    }
    await sleep(interval);
  }

  err(`[stream:${label}] stopped after ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
  process.removeListener('SIGINT', cleanup);
  process.removeListener('SIGTERM', cleanup);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Stream: quote ──

async function fetchQuote() {
  return evaluate(`
    (function() {
      var chart = ${CHART_API};
      var m = ${MODEL};
      var bars = m.mainSeries().bars();
      var last = bars.lastIndex();
      var v = bars.valueAt(last);
      if (!v) return null;
      return {
        symbol: chart.symbol(),
        time: v[0],
        open: v[1],
        high: v[2],
        low: v[3],
        close: v[4],
        volume: v[5] || 0,
      };
    })()
  `);
}

// Per-stream fingerprints (cheap, no full stringify). Exported for testing.
export const fpQuote = (d) => d ? `${d.time}:${d.close}:${d.volume}` : 'null';
export const fpBars = (d) => d ? `${d.bar_time}:${d.close}:${d.volume}` : 'null';

export async function streamQuote({ interval, sink } = {}) {
  return pollLoop(fetchQuote, { interval: interval || 300, label: 'quote', sink, fingerprint: fpQuote });
}

// ── Stream: ohlcv (last N bars, emits on new bar) ──

async function fetchLastBar() {
  return evaluate(`
    (function() {
      var chart = ${CHART_API};
      var m = ${MODEL};
      var bars = m.mainSeries().bars();
      var last = bars.lastIndex();
      var v = bars.valueAt(last);
      if (!v) return null;
      return {
        symbol: chart.symbol(),
        resolution: chart.resolution(),
        bar_time: v[0],
        open: v[1],
        high: v[2],
        low: v[3],
        close: v[4],
        volume: v[5] || 0,
        bar_index: last,
      };
    })()
  `);
}

export async function streamBars({ interval, sink } = {}) {
  return pollLoop(fetchLastBar, { interval: interval || 500, label: 'bars', sink, fingerprint: fpBars });
}

// ── Stream: indicator values ──

async function fetchValues() {
  return evaluate(`
    (function() {
      var chart = ${CHART_API};
      var m = ${MODEL};
      var studies = chart.getAllStudies();
      var results = [];
      for (var i = 0; i < studies.length; i++) {
        try {
          var study = chart.getStudyById(studies[i].id);
          if (!study || !study.isVisible()) continue;
          var src = study._study || study;
          var data = src._lastBarValues || src._data;
          if (!data) continue;
          var vals = {};
          if (typeof data === 'object') {
            for (var k in data) {
              if (typeof data[k] === 'number' && !isNaN(data[k])) vals[k] = data[k];
            }
          }
          if (Object.keys(vals).length > 0) results.push({ name: studies[i].name, values: vals });
        } catch(e) {}
      }
      return { symbol: chart.symbol(), study_count: results.length, studies: results };
    })()
  `);
}

/**
 * Fingerprint for the {symbol, study_count, studies:[{name, values|levels|labels|tables}]}
 * shape shared by the value/lines/labels/tables streams. A full JSON.stringify
 * of nested studies would defeat the purpose, but the top-level shallow
 * fingerprint misses changes WITHIN studies, so we hash symbol + each study's
 * name and a compact summary of its payload. Still far cheaper than serializing
 * the whole nested object every cycle (no string allocation for keys/braces).
 */
export function fpStudies(d) {
  if (!d) return 'null';
  let s = d.symbol + '#' + d.study_count;
  const studies = d.studies || [];
  for (const st of studies) {
    s += '|' + (st.name || st.study || '');
    if (st.values) { for (const k in st.values) s += ';' + k + '=' + st.values[k]; }
    else if (st.levels) { s += ';L' + st.levels.join(','); }
    else if (st.labels) { s += ';B' + st.labels.length; for (const lb of st.labels) s += '/' + lb.text + '@' + lb.price; }
    else if (st.tables) { s += ';T' + st.tables.length; for (const t of st.tables) s += '/' + (t.rows ? t.rows.length : 0); }
  }
  return s;
}

export async function streamValues({ interval, sink } = {}) {
  return pollLoop(fetchValues, { interval: interval || 500, label: 'values', sink, fingerprint: fpStudies });
}

// ── Stream: pine lines ──

async function fetchLines(studyFilter) {
  const filter = studyFilter ? JSON.stringify(studyFilter) : 'null';
  return evaluate(`
    (function() {
      var filter = ${filter};
      var chart = ${CHART_API};
      var studies = chart.getAllStudies();
      var results = [];
      for (var i = 0; i < studies.length; i++) {
        var s = studies[i];
        if (filter && (s.name || '').toLowerCase().indexOf(filter.toLowerCase()) === -1) continue;
        try {
          var study = chart.getStudyById(s.id);
          if (!study) continue;
          var src = study._study || study;
          var g = src._graphics || (src._source && src._source._graphics);
          if (!g) continue;
          var pc = g._primitivesCollection;
          if (!pc || !pc.dwglines) continue;
          var linesMap = pc.dwglines.get('lines');
          if (!linesMap) continue;
          var data = linesMap.get(false);
          if (!data || !data._primitivesDataById) continue;
          var levels = [];
          var seen = {};
          data._primitivesDataById.forEach(function(line) {
            var p1 = line.points && line.points[0] ? line.points[0].price : null;
            var p2 = line.points && line.points[1] ? line.points[1].price : null;
            var price = (p1 !== null && p1 === p2) ? p1 : (p1 || p2);
            if (price !== null && !seen[price]) { seen[price] = true; levels.push(price); }
          });
          levels.sort(function(a, b) { return b - a; });
          if (levels.length > 0) results.push({ study: s.name, levels: levels });
        } catch(e) {}
      }
      return { symbol: chart.symbol(), study_count: results.length, studies: results };
    })()
  `);
}

export async function streamLines({ interval, filter, sink } = {}) {
  return pollLoop(() => fetchLines(filter), { interval: interval || 1000, label: 'lines', sink, fingerprint: fpStudies });
}

// ── Stream: pine labels ──

async function fetchLabels(studyFilter) {
  const filterStr = studyFilter ? JSON.stringify(studyFilter) : 'null';
  return evaluate(`
    (function() {
      var filter = ${filterStr};
      var chart = ${CHART_API};
      var studies = chart.getAllStudies();
      var results = [];
      for (var i = 0; i < studies.length; i++) {
        var s = studies[i];
        if (filter && (s.name || '').toLowerCase().indexOf(filter.toLowerCase()) === -1) continue;
        try {
          var study = chart.getStudyById(s.id);
          if (!study) continue;
          var src = study._study || study;
          var g = src._graphics || (src._source && src._source._graphics);
          if (!g) continue;
          var pc = g._primitivesCollection;
          if (!pc || !pc.dwglabels) continue;
          var labelsMap = pc.dwglabels.get('labels');
          if (!labelsMap) continue;
          var data = labelsMap.get(false);
          if (!data || !data._primitivesDataById) continue;
          var labels = [];
          data._primitivesDataById.forEach(function(lbl) {
            var text = lbl.text || '';
            var price = lbl.points && lbl.points[0] ? lbl.points[0].price : null;
            if (text) labels.push({ text: text, price: price });
          });
          if (labels.length > 0) results.push({ study: s.name, labels: labels.slice(0, 50) });
        } catch(e) {}
      }
      return { symbol: chart.symbol(), study_count: results.length, studies: results };
    })()
  `);
}

export async function streamLabels({ interval, filter, sink } = {}) {
  return pollLoop(() => fetchLabels(filter), { interval: interval || 1000, label: 'labels', sink, fingerprint: fpStudies });
}

// ── Stream: pine tables ──

async function fetchTables(studyFilter) {
  const filterStr = studyFilter ? JSON.stringify(studyFilter) : 'null';
  return evaluate(`
    (function() {
      var filter = ${filterStr};
      var chart = ${CHART_API};
      var studies = chart.getAllStudies();
      var results = [];
      for (var i = 0; i < studies.length; i++) {
        var s = studies[i];
        if (filter && (s.name || '').toLowerCase().indexOf(filter.toLowerCase()) === -1) continue;
        try {
          var study = chart.getStudyById(s.id);
          if (!study) continue;
          var src = study._study || study;
          var g = src._graphics || (src._source && src._source._graphics);
          if (!g) continue;
          var pc = g._primitivesCollection;
          if (!pc || !pc.ownFirstValue) continue;
          var tableMap = pc.ownFirstValue();
          if (!tableMap) continue;
          var tables = [];
          if (typeof tableMap.forEach === 'function') {
            tableMap.forEach(function(table) {
              if (!table || !table.data) return;
              var rows = [];
              for (var r = 0; r < table.data.length; r++) {
                var row = [];
                for (var c = 0; c < table.data[r].length; c++) {
                  row.push(table.data[r][c].text || '');
                }
                rows.push(row);
              }
              tables.push({ rows: rows });
            });
          }
          if (tables.length > 0) results.push({ study: s.name, tables: tables });
        } catch(e) {}
      }
      return { symbol: chart.symbol(), study_count: results.length, studies: results };
    })()
  `);
}

export async function streamTables({ interval, filter, sink } = {}) {
  return pollLoop(() => fetchTables(filter), { interval: interval || 2000, label: 'tables', sink, fingerprint: fpStudies });
}

// ── Stream: all panes (multi-symbol) ──

const CWC = 'window.TradingViewApi._chartWidgetCollection';

async function fetchAllPanes() {
  return evaluate(`
    (function() {
      var cwc = ${CWC};
      var all = cwc.getAll();
      var layoutType = cwc._layoutType;
      if (typeof layoutType === 'object' && layoutType && typeof layoutType.value === 'function') layoutType = layoutType.value();
      var count = cwc.inlineChartsCount;
      if (typeof count === 'object' && count && typeof count.value === 'function') count = count.value();

      var panes = [];
      for (var i = 0; i < Math.min(all.length, count || all.length); i++) {
        try {
          var c = all[i];
          var model = c.model();
          var ms = model.mainSeries();
          var bars = ms.bars();
          var last = bars.lastIndex();
          var v = bars.valueAt(last);
          if (!v) { panes.push({ index: i, symbol: ms.symbol(), error: 'no bars' }); continue; }
          panes.push({
            index: i,
            symbol: ms.symbol(),
            resolution: ms.interval(),
            time: v[0],
            open: v[1],
            high: v[2],
            low: v[3],
            close: v[4],
            volume: v[5] || 0,
          });
        } catch(e) { panes.push({ index: i, error: e.message }); }
      }
      return { layout: layoutType, pane_count: panes.length, panes: panes };
    })()
  `);
}

export function fpPanes(d) {
  if (!d) return 'null';
  let s = (d.layout || '') + '#' + d.pane_count;
  for (const p of (d.panes || [])) s += '|' + p.index + ':' + (p.symbol || '') + ':' + p.time + ':' + p.close + ':' + p.volume + ':' + (p.error || '');
  return s;
}

export async function streamAllPanes({ interval, sink } = {}) {
  return pollLoop(fetchAllPanes, { interval: interval || 500, label: 'all-panes', sink, fingerprint: fpPanes });
}
