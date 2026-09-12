// Sonda: piscinas de OSM (Nervión) y parques infantiles (Pino Montano). Teletransporta la moto al
// centro de una piscina y mira el aviso, el dinero y que el agua frena; luego cuenta columpios y toboganes.
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
const nivel = JSON.parse(await readFile(join(DIST, 'barrios/nervion/nivel.json'), 'utf8'));
const piscinas = nivel.zonas.filter((z) => z.clase === 'pool').map((z) => { const n = z.poligono.length; return [z.poligono.reduce((a, q) => a + q[0], 0) / n, z.poligono.reduce((a, q) => a + q[1], 0) / n]; });
// La primera que no esté dentro de un edificio (las de patio interior no se ven).
const dentro = (x, z, poly) => { let d = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) d = !d; } return d; };
const libres = piscinas.filter(([x, z]) => !nivel.edificios.some((e) => dentro(x, z, e.poligono)));
console.log('piscinas en Nervión:', piscinas.length, '· fuera de edificios:', libres.length);
await p.goto(`${base}/?barrio=nervion`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => { window.__pv_prueba.hora(12); window.__pv_prueba.dinero(0); });
await dormir(800);
const [px, pz] = libres[0] ?? piscinas[0];
await p.evaluate(([x, z]) => { window.__pv_prueba.irA(x - 6, z); window.__pv_prueba.empujar(10, 0); }, [px, pz]);
let v = [];
for (let i = 0; i < 12; i++) { await dormir(300); v.push(Math.round((await p.evaluate(() => window.__pv_info().vehiculo))[2] * 10) / 10); }
console.log('velocidad al entrar en la piscina:', v.join(' '), '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent), '· dinero:', await p.evaluate(() => document.querySelector('#hud-dinero').textContent));
await p.screenshot({ path: 'logs/captura-piscina.png' });
await p.goto(`${base}/?barrio=pino-montano`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
const columpios = await p.evaluate(() => window.__pv_prueba.trastos('columpio'));
const toboganes = await p.evaluate(() => window.__pv_prueba.trastos('tobogan'));
console.log('columpios:', JSON.stringify(columpios), 'toboganes:', JSON.stringify(toboganes));
if (columpios[0]) { await p.evaluate(([x, z]) => { window.__pv_prueba.irA(x - 4, z); window.__pv_prueba.empujar(14, 0); }, columpios[0]); await dormir(2500); await p.evaluate(([x, z]) => window.__pv_prueba.irA(x, z + 8), columpios[0]); await dormir(600); await p.screenshot({ path: 'logs/captura-parque.png' }); console.log('tras embestir el columpio:', await p.evaluate(() => document.querySelector('#aviso').textContent)); }
await b.close(); srv.close();
