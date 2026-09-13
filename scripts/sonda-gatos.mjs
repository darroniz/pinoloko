// Sonda: los gatos (en coches y bancos): acercarse, ver que huye, alejarse y ver que vuelve.
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
await p.evaluate(() => { window.__pv_prueba.hora(12); });
await dormir(500);
let gatos = await p.evaluate(() => window.__pv_prueba.gatos());
console.log('gatos:', gatos.length, 'en coches:', gatos.filter((g) => g.coche).length, JSON.stringify(gatos.slice(0, 3)));
const g0 = [...gatos].sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0]; // el más céntrico
console.log('objetivo:', JSON.stringify(g0));
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x - 7, z, Math.PI / 2), [g0.x, g0.z]);
await dormir(600);
await p.screenshot({ path: 'logs/captura-gato.png' });
await p.evaluate(() => { window.__pv_prueba.forzarEje(1, 0); window.__pv_prueba.empujar(6, 0); });
let g = null;
for (let i = 0; i < 12; i++) { await dormir(400); gatos = await p.evaluate(() => window.__pv_prueba.gatos()); g = gatos.find((x) => x.estado !== 'sentado'); const e = await p.evaluate(() => window.__pv_prueba.estilo()); if (i % 3 === 0) console.log('  d:', Math.round(Math.hypot(e.x - g0.x, e.z - g0.z)), 'v:', e.velocidad); if (g) break; }
await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
console.log('tras acercarse:', JSON.stringify(g), '· espantados:', await p.evaluate(() => window.__pv_prueba.stats().gatos));
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x + 60, z + 60, 0), [g0.x, g0.z]);
for (let i = 0; i < 40; i++) { await dormir(1000); gatos = await p.evaluate(() => window.__pv_prueba.gatos()); if (gatos.every((x) => x.estado === 'sentado')) break; }
console.log('al rato, sentados:', gatos.filter((x) => x.estado === 'sentado').length, 'de', gatos.length);
await b.close(); srv.close();
