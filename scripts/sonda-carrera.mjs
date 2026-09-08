// Sonda: carrera completa por teletransporte a cada punto, y salto por una rampa.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = '/home/idarroniz/pinoloko/dist';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const barrio = process.argv[2] ?? 'pino-montano';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=${barrio}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await new Promise((r) => setTimeout(r, 1000));
const carreras = await p.evaluate(() => window.__pv_prueba.carreras());
console.log('carreras:', carreras.length, 'puntos:', carreras.map((c) => c.length).join('/'));
const ruta = carreras[0];
const meta = ruta[ruta.length - 1];
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x, z), meta);
for (let i = 0; i < 6; i++) { await new Promise((r) => setTimeout(r, 250)); console.log('  t', i, JSON.stringify(await p.evaluate(() => window.__pv_prueba.carrera())), await p.evaluate(() => document.querySelector('#hud-carrera').className)); }
console.log('en carrera:', await p.evaluate(() => document.querySelector('#hud-carrera').classList.contains('visible')), await p.evaluate(() => document.querySelector('#hud-carrera').textContent));
await p.screenshot({ path: 'logs/captura-carrera.png' });
for (const [x, z] of ruta) { await p.evaluate(([a, c]) => window.__pv_prueba.irA(a, c), [x, z]); await new Promise((r) => setTimeout(r, 1000)); console.log('  punto', JSON.stringify(await p.evaluate(() => window.__pv_prueba.carrera())), JSON.stringify(await p.evaluate(() => window.__pv_info().vehiculo.map((v) => Math.round(v * 10) / 10)))); }
console.log('tras la meta:', await p.evaluate(() => document.querySelector('#hud-carrera').classList.contains('visible')), 'aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent), 'records:', await p.evaluate(() => localStorage.getItem('pinoloko.carreras.v1')));
// Rampa: 9 m antes, mirando hacia ella, a fondo.
const rampas = await p.evaluate(() => window.__pv_prueba.rampas());
console.log('rampas:', rampas.length);
const r0 = rampas[0];
await p.evaluate((r) => window.__pv_prueba.irA(r.x - Math.sin(r.rumbo) * 9, r.z + Math.cos(r.rumbo) * 9, r.rumbo), r0);
await new Promise((r) => setTimeout(r, 300));
let maxY = 0;
await p.keyboard.down('w');
// El stick "w" es norte en pantalla: usamos el rumbo real con el eje que toque.
await p.keyboard.up('w');
await p.evaluate((r) => { window.__pv_prueba.empujar(Math.sin(r.rumbo) * 14, -Math.cos(r.rumbo) * 14); window.__pv_prueba.forzarEje(Math.sin(r.rumbo), Math.cos(r.rumbo)); }, r0);
console.log('rampa', JSON.stringify(r0));
for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 120)); const v = await p.evaluate(() => window.__pv_info().vehiculo); maxY = Math.max(maxY, v[3]); if (i % 3 === 0) console.log('  ', v.map((n) => Math.round(n * 100) / 100).join(' ')); }
console.log('salto: altura máxima', maxY.toFixed(2), 'm (suelo ≈ 0.65)');
await p.screenshot({ path: 'logs/captura-rampa.png' });
await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
console.log('aviso salto:', await p.evaluate(() => document.querySelector('#aviso').textContent));
await b.close(); srv.close();
