// Sonda: a cinco estrellas aparece el helicóptero; su foco te mantiene visto; se va al bajar.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${srv.address().port}/?barrio=pino-montano`;
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await p.goto(url, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => { window.__pv_prueba.hora(21); window.__pv_prueba.calor(480); });
for (let i = 0; i < 4; i++) {
  await new Promise((r) => setTimeout(r, 2500));
  console.log(i, JSON.stringify(await p.evaluate(() => { const i = window.__pv_info(); return { estrellas: i.estrellas, calor: i.calor, heli: window.__pv_prueba.helicoptero(), patrullas: i.patrullas.length }; })));
}
await p.screenshot({ path: 'logs/captura-heli.png' });
await p.evaluate(() => window.__pv_prueba.calor(100));
for (let i = 0; i < 3; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  console.log('bajando', JSON.stringify(await p.evaluate(() => ({ estrellas: window.__pv_info().estrellas, heli: window.__pv_prueba.helicoptero() }))));
}
await b.close(); srv.close();
