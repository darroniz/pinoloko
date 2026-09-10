// Sonda: la Local a pie. Con dos estrellas y Wifly a pie salen agentes por los pasajes; quieto,
// acaban trincándolo. Captura en logs/captura-agentes.png.
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
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=pino-montano`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => window.__pv_prueba.hora(12));
await new Promise((r) => setTimeout(r, 800));
// A un punto de control de la carrera (nodo peatonal, lejos de la calzada): ahí el coche patrulla no llega.
const punto = (await p.evaluate(() => window.__pv_prueba.carreras()))[0][1];
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x, z, 0), punto);
await new Promise((r) => setTimeout(r, 500));
await p.keyboard.press('e'); // a pie
await new Promise((r) => setTimeout(r, 500));
await p.evaluate(() => window.__pv_prueba.calor(150)); // dos estrellas (sin motos de la Local)
let agentes = [];
for (let i = 0; i < 40 && agentes.length < 1; i++) { await new Promise((r) => setTimeout(r, 250)); agentes = await p.evaluate(() => window.__pv_prueba.agentes()); }
console.log('agentes:', JSON.stringify(agentes), 'aPie:', await p.evaluate(() => window.__pv_info().aPie), 'estrellas:', await p.evaluate(() => window.__pv_info().estrellas));
await new Promise((r) => setTimeout(r, 4000));
const luego = await p.evaluate(() => window.__pv_prueba.agentes());
const pos = await p.evaluate(() => window.__pv_info().peaton);
console.log('a los 5 s:', JSON.stringify(luego), 'distancias:', luego.map((a) => Math.round(Math.hypot(a.x - pos[0], a.z - pos[1]))));
await p.screenshot({ path: 'logs/captura-agentes.png' });
let trincao = false;
let ultimo = [];
for (let i = 0; i < 70 && !trincao; i++) { await new Promise((r) => setTimeout(r, 500)); if (i % 4 === 0) await p.evaluate(() => window.__pv_prueba.calor(150)); trincao = await p.evaluate(() => document.querySelector('#aviso').textContent.includes('guante')); if (i % 6 === 0) { ultimo = await p.evaluate(() => window.__pv_prueba.agentes()); const q = await p.evaluate(() => window.__pv_info().peaton); console.log('  ', JSON.stringify(ultimo.map((a) => Math.round(Math.hypot(a.x - q[0], a.z - q[1]))))); } }
console.log('trincao:', trincao, 'aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent), 'trincados:', await p.evaluate(() => window.__pv_info().estrellas));
await b.close(); srv.close();
