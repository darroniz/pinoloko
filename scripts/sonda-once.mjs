// Sonda: el de la ONCE (comprar cupones a pie con E y el sorteo forzado).
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
await p.evaluate(() => { window.__pv_prueba.hora(12); window.__pv_prueba.dinero(50); });
await dormir(500);
let o = await p.evaluate(() => window.__pv_prueba.once());
console.log('vendedor:', JSON.stringify(o.vendedor));
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x + 1.2, z + 2.2, 0), [o.vendedor.x, o.vendedor.z]);
await dormir(600);
await p.keyboard.press('KeyE'); // bajarse
await dormir(900);
await p.screenshot({ path: 'logs/captura-once.png' });
await p.keyboard.press('KeyE'); // comprar (si está a menos de 2,6 m)
await dormir(900);
o = await p.evaluate(() => window.__pv_prueba.once());
console.log('tras E a pie:', JSON.stringify(o.cupones), '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent), '· dinero:', await p.evaluate(() => document.querySelector('#hud-dinero').textContent));
if (!o.cupones.length) { await p.evaluate(() => window.__pv_prueba.comprarCupon()); await p.evaluate(() => window.__pv_prueba.comprarCupon()); }
const s = await p.evaluate(() => window.__pv_prueba.sortear());
await dormir(400);
console.log('sorteo:', JSON.stringify(s), '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent), '· dinero:', await p.evaluate(() => document.querySelector('#hud-dinero').textContent));
await b.close(); srv.close();
