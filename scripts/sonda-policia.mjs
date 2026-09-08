import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await p.goto(`http://127.0.0.1:${srv.address().port}/?calidad=baja`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await new Promise((r) => setTimeout(r, 3000));
await p.evaluate(() => window.__pv_prueba.calor(300));
let f0 = await p.evaluate(() => window.__pv_frames);
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const f1 = await p.evaluate(() => window.__pv_frames);
  console.log('fps', f1 - f0, 'timestep', await p.evaluate(() => window.__pv_info().timestep));
  f0 = f1;
  const info = await p.evaluate(() => { const i = window.__pv_info(); return { patrullas: i.patrullas, v: i.vehiculo.map((n) => Math.round(n)), trincao: document.getElementById('trincao').classList.contains('visible') }; });
  if (i % 3 === 0 || info.trincao) console.log('t+' + i, JSON.stringify(info));
  if (info.trincao) break;
}
await b.close(); srv.close();
