// Sonda: el colega de paquete (en scooter): fuerza un cliente, va a su lado, ve que sube, va al destino y cobra.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=pino-montano`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => { window.__pv_prueba.hora(12); window.__pv_prueba.dinero(0); window.__pv_prueba.colegaYa(); });
let pq = null;
for (let i = 0; i < 20; i++) { await dormir(500); pq = await p.evaluate(() => window.__pv_prueba.paquete()); if (pq.clientes.length) break; }
console.log('colega:', JSON.stringify(pq));
const c = pq.clientes[0];
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x + 2, z, 0), [c.x, c.z]);
for (let i = 0; i < 20; i++) { await dormir(500); pq = await p.evaluate(() => window.__pv_prueba.paquete()); if (pq.estado === 'ocupado') break; }
console.log('sube:', JSON.stringify(pq), '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
await dormir(600);
await p.screenshot({ path: 'logs/captura-paquete.png' });
if (pq.destino) {
  await p.evaluate(([x, z]) => window.__pv_prueba.irA(x + 2, z + 2, 0), [pq.destino.x, pq.destino.z]);
  for (let i = 0; i < 20; i++) { await dormir(500); pq = await p.evaluate(() => window.__pv_prueba.paquete()); if (pq.estado === 'libre') break; }
}
console.log('final:', JSON.stringify(pq), '· paquetes:', await p.evaluate(() => window.__pv_prueba.stats().paquetes), '· dinero:', await p.evaluate(() => document.querySelector('#hud-dinero').textContent), '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
await b.close(); srv.close();
