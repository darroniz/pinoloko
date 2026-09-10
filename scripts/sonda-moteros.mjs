// Sonda: motos callejeras rodando (captura) y robo en marcha a pie con E.
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
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await p.goto(url, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => window.__pv_prueba.hora(12));
const m0 = await p.evaluate(() => window.__pv_prueba.moteros()[0]);
console.log('motero', JSON.stringify(m0), 'total', await p.evaluate(() => window.__pv_prueba.moteros().length));
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x + 4, z + 4, 0), [m0.x, m0.z]);
await new Promise((r) => setTimeout(r, 1200));
await p.screenshot({ path: 'logs/captura-moteros.png' });
// Bajarse y esperar a que pase uno cerca; entonces E.
await p.keyboard.press('e');
await new Promise((r) => setTimeout(r, 500));
let robada = false;
for (let i = 0; i < 40 && !robada; i++) {
  const cerca = await p.evaluate(() => { const i = window.__pv_info(); const [px, pz] = i.peaton; return window.__pv_prueba.moteros().some((m) => Math.hypot(m.x - px, m.z - pz) < 3); });
  if (cerca) { await p.keyboard.press('e'); await new Promise((r) => setTimeout(r, 300)); robada = !(await p.evaluate(() => window.__pv_info().aPie)); }
  else await new Promise((r) => setTimeout(r, 250));
}
console.log('robada en marcha', robada, JSON.stringify(await p.evaluate(() => ({ aviso: document.getElementById('aviso').textContent, moteros: window.__pv_prueba.moteros().length, estrellas: window.__pv_info().estrellas }))));
await b.close(); srv.close();
