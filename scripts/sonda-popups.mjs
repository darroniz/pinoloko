// Sonda: textos flotantes de dinero al romper el mercadillo.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=pino-montano`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => window.__pv_prueba.hora(12));
const puestos = await p.evaluate(() => window.__pv_prueba.trastos('puesto'));
const [px, pz] = puestos[4];
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x, z + 5, 0), [px, pz]);
await p.evaluate(() => window.__pv_prueba.empujar(0, -12));
let vistos = [];
for (let i = 0; i < 15 && !vistos.length; i++) {
  await new Promise((r) => setTimeout(r, 200));
  vistos = await p.evaluate(() => [...document.querySelectorAll('.flota')].map((d) => d.textContent));
  if (vistos.length) await p.screenshot({ path: 'logs/captura-popups.png' });
}
console.log('flotantes', vistos, 'dinero', await p.evaluate(() => document.getElementById('hud-dinero').textContent), 'rotos', await p.evaluate(() => window.__pv_info().rotos));
await b.close(); srv.close();
