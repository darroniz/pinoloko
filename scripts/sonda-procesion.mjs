// Sonda: la procesión (Pino Montano): la saca, va a verla, captura, se cuela por medio (cruzada) y
// se para junto al paso (respeto).
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
const base = `http://127.0.0.1:${srv.address().port}`;
await p.goto(`${base}/?barrio=${process.argv[2] ?? 'pino-montano'}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => { window.__pv_prueba.hora(20); window.__pv_prueba.dinero(0); });
await dormir(800);
let pr = await p.evaluate(() => window.__pv_prueba.procesion());
console.log('al poner las ocho:', JSON.stringify(pr));
if (!pr.activa) { console.log('sacar:', await p.evaluate(() => window.__pv_prueba.sacarProcesion())); pr = await p.evaluate(() => window.__pv_prueba.procesion()); }
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x + 9, z + 4, 0), [pr.paso.x, pr.paso.z]);
await dormir(1500);
await p.screenshot({ path: 'logs/captura-procesion.png' });
// Respeto: quieto al lado del paso.
let stats = await p.evaluate(() => window.__pv_prueba.stats());
for (let i = 0; i < 30 && !stats.respetos; i++) { await dormir(800); stats = await p.evaluate(() => window.__pv_prueba.stats()); }
console.log('respetos:', stats.respetos, '· dinero:', await p.evaluate(() => document.querySelector('#hud-dinero').textContent), '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
// Cruzada: por medio a fondo.
pr = await p.evaluate(() => window.__pv_prueba.procesion());
await p.evaluate(([x, z]) => { window.__pv_prueba.irA(x - 8, z, Math.PI / 2); window.__pv_prueba.forzarEje(1, 0); window.__pv_prueba.empujar(14, 0); }, [pr.paso.x, pr.paso.z]);
for (let i = 0; i < 10 && !stats.cruzadas; i++) { await dormir(500); stats = await p.evaluate(() => window.__pv_prueba.stats()); }
await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
console.log('cruzadas:', stats.cruzadas, '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
await p.screenshot({ path: 'logs/captura-procesion-2.png' });
// La saeta: el paso se para.
const sa = await p.evaluate(() => window.__pv_prueba.saeta());
const antes = await p.evaluate(() => window.__pv_prueba.procesion());
await dormir(3000);
const despues = await p.evaluate(() => window.__pv_prueba.procesion());
console.log('saeta:', JSON.stringify(sa), '· paso antes/después:', JSON.stringify(antes.paso), JSON.stringify(despues.paso), '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
await b.close(); srv.close();
