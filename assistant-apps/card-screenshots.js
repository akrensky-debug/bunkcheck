// Screenshots of the camp cards for the Claude directory listing (docs/directory-submissions.md).
//
//   node assistant-apps/card-screenshots.js [MCP endpoint] [output folder]
//
// Fetches the live widget (resources/read) and real tool results (tools/call) from the endpoint,
// plays the MCP Apps host in a page (ui/initialize, tool-result, theme), and screenshots the
// cards at 720 px, scale 2, so each PNG is 1440 px wide. Needs Playwright.
const { chromium } = require('playwright');
const fs = require('fs');
const API = process.argv[2] || 'https://api-production-4a03.up.railway.app/claude/mcp';
const OUT = process.argv[3] || 'assistant-apps/screenshots';

async function rpc(method, params) {
  const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-11-25' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const b = await r.json(); if (b.error) throw new Error(JSON.stringify(b.error)); return b.result;
}

// Each screenshot pairs with the prompt a reviewer reads next to it. limit: 3 keeps the image
// to the first three cards, the way the directory wants it cropped.
const P1 = 'Find summer day camps near Providence, RI for my 8-year-old.'
const P2 = 'Day camps near Providence with extended care for under $350 a week.'
const P3 = 'What camps still have openings the week of July 5 near Cranston, RI?'
const SHOTS = [
  { file: '1-providence-age-8.png', theme: 'light', prompt: P1,
    tool: 'search_camps', args: { location: 'Providence, RI', age: 8, camp_type: 'day', limit: 3 } },
  { file: '2-providence-extended-care-under-350.png', theme: 'light', prompt: P2,
    tool: 'search_camps', args: { location: 'Providence, RI', camp_type: 'day', requires_extended_care: true, max_price_per_week: 350, limit: 3 } },
  { file: '3-cranston-week-of-july-5.png', theme: 'light', prompt: P3,
    tool: 'find_sessions', args: { location: 'Cranston, RI', starts_on_or_after: '2027-07-05', ends_on_or_before: '2027-07-11', limit: 3 } },
  { file: '4-providence-age-8-dark.png', theme: 'dark', prompt: P1,
    tool: 'search_camps', args: { location: 'Providence, RI', age: 8, camp_type: 'day', limit: 3 } },
];

(async () => {
  const tools = (await rpc('tools/list', {})).tools;
  const uri = tools.find(t => t.name === 'search_camps')._meta.ui.resourceUri;
  const html = (await rpc('resources/read', { uri })).contents[0].text;
  const browser = await chromium.launch();
  const meta = [];
  for (const s of SHOTS) {
    const result = await rpc('tools/call', { name: s.tool, arguments: s.args });
    const sc = result.structuredContent || {};
    const n = (sc.camps || sc.sessions || []).length;
    const page = await browser.newPage({ viewport: { width: 720, height: 900 }, deviceScaleFactor: 2, colorScheme: s.theme });
    const bg = s.theme === 'dark' ? '#262624' : '#FAF9F5';
    await page.setContent(`<html><body style="margin:0;background:${bg}"><iframe id="w" style="border:0;width:720px;height:200px;display:block"></iframe></body></html>`);
    await page.evaluate(({ html, sc, theme }) => new Promise(done => {
      const f = document.getElementById('w');
      window.addEventListener('message', e => {
        const m = e.data || {};
        if (m.method === 'ui/initialize') f.contentWindow.postMessage({ jsonrpc: '2.0', id: m.id, result: {
          protocolVersion: '2026-01-26', hostInfo: { name: 'harness', version: '1' }, hostCapabilities: {}, hostContext: { theme } } }, '*');
        else if (m.method === 'ui/notifications/initialized') { f.contentWindow.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: { structuredContent: sc } }, '*'); setTimeout(done, 1500); }
        else if (m.method === 'ui/notifications/size-changed') f.style.height = m.params.height + 'px';
        else if (m.id !== undefined) f.contentWindow.postMessage({ jsonrpc: '2.0', id: m.id, result: {} }, '*');
      });
      f.srcdoc = html;
    }), { html, sc, theme: s.theme });
    await page.waitForTimeout(800);
    const el = await page.$('#w');
    await el.screenshot({ path: `${OUT}/${s.file}` });
    meta.push({ file: s.file, prompt: s.prompt, tool: s.tool, arguments: s.args, results: n });
    console.log(s.file, s.tool, n, 'results');
    await page.close();
  }
  fs.writeFileSync(`${OUT}/screenshots.json`, JSON.stringify(meta, null, 2));
  await browser.close();
})();
