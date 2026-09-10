// Sonda: pique contra los tres canis. Arranca una carrera, mira que los rivales se mueven, que el
// HUD lleva el puesto y que al llegar a la meta sale el aviso con el puesto. Captura en logs/.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const barrio = process.argv[2] ?? 'pino-montano';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=${barrio}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => window.__pv_prueba.hora(12));
await new Promise((r) => setTimeout(r, 800));
const ruta = (await p.evaluate(() => window.__pv_prueba.carreras()))[0];
const meta = ruta[ruta.length - 1];
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x, z), meta);
await new Promise((r) => setTimeout(r, 600));
console.log('arranque:', JSON.stringify(await p.evaluate(() => window.__pv_prueba.rivales())));
await new Promise((r) => setTimeout(r, 2500));
const r1 = await p.evaluate(() => window.__pv_prueba.rivales());
console.log('a los 3 s:', JSON.stringify(r1), 'hud:', await p.evaluate(() => document.querySelector('#hud-carrera').textContent));
await p.screenshot({ path: 'logs/captura-pique.png' });
// Wifly se teletransporta por los puntos: llega el primero.
for (const [x, z] of ruta) { await p.evaluate(([a, c]) => window.__pv_prueba.irA(a, c), [x, z]); await new Promise((r) => setTimeout(r, 400)); }
console.log('meta:', await p.evaluate(() => document.querySelector('#aviso').textContent), 'rivales tras meta:', JSON.stringify(await p.evaluate(() => window.__pv_prueba.rivales())));
// Segunda carrera: esperamos a que lleguen ellos y luego Wifly.
await new Promise((r) => setTimeout(r, 9000));
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x, z), meta);
await new Promise((r) => setTimeout(r, 600));
let llegados = 0;
for (let i = 0; i < 60 && llegados < 3; i++) { await new Promise((r) => setTimeout(r, 2000)); llegados = (await p.evaluate(() => window.__pv_prueba.rivales())).filter((x) => x.tiempo >= 0).length; }
console.log('rivales llegados:', llegados, 'hud:', await p.evaluate(() => document.querySelector('#hud-carrera').textContent));
for (const [x, z] of ruta) { await p.evaluate(([a, c]) => window.__pv_prueba.irA(a, c), [x, z]); await new Promise((r) => setTimeout(r, 400)); }
console.log('meta (último):', await p.evaluate(() => document.querySelector('#aviso').textContent));
await b.close(); srv.close();
