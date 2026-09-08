// Sonda: medianas de cada tramo del update() en un barrio.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = '/home/idarroniz/pinoloko/dist';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const barrio = process.argv[2] ?? 'alameda';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=${barrio}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await new Promise((r) => setTimeout(r, 3000));
await p.evaluate(() => performance.clearMeasures());
await p.keyboard.down('w'); await new Promise((r) => setTimeout(r, 8000)); await p.keyboard.up('w');
const med = await p.evaluate(() => {
  const out = {};
  for (const n of ['update', 'render', 'u-fisica', 'u-vecinos', 'u-policia', 'u-trastos', 'u-resto']) {
    const m = performance.getEntriesByName(n).map((e) => e.duration).sort((a, c) => a - c);
    out[n] = m.length ? +m[Math.floor(m.length / 2)].toFixed(2) : -1;
  }
  return out;
});
console.log(barrio, JSON.stringify(med));
await b.close(); srv.close();
