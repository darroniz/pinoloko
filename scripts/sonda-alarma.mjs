// Sonda: alarma de coche aparcado. Wifly embiste un coche aparcado y se comprueba la alarma
// (intermitentes, aviso y estadística). Captura en logs/captura-alarma.png.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const barrio = process.argv[2] ?? 'los-remedios';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=${barrio}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => window.__pv_prueba.hora(12));
await new Promise((r) => setTimeout(r, 800));
const aparcados = await p.evaluate(() => window.__pv_prueba.aparcados());
console.log('aparcados:', aparcados.length);
const [cx, cz, rumbo] = aparcados[0];
// Nos ponemos 7 m detrás del coche (en su eje) y lo embestimos.
const dx = Math.sin(rumbo), dz = -Math.cos(rumbo);
await p.evaluate(([x, z, r]) => window.__pv_prueba.irA(x, z, r), [cx - dx * 7, cz - dz * 7, rumbo]);
await new Promise((r) => setTimeout(r, 500));
await p.evaluate(([vx, vz, ex, ez]) => { window.__pv_prueba.empujar(vx, vz); window.__pv_prueba.forzarEje(ex, ez); }, [dx * 14, dz * 14, dx, -dz]);
let alarmas = 0;
for (let i = 0; i < 20 && !alarmas; i++) { await new Promise((r) => setTimeout(r, 150)); alarmas = await p.evaluate(() => window.__pv_info().alarmas); }
await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
console.log('alarmas sonando:', alarmas, 'aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent), 'calor:', await p.evaluate(() => window.__pv_info().calor));
await new Promise((r) => setTimeout(r, 400));
await p.screenshot({ path: 'logs/captura-alarma.png' });
await new Promise((r) => setTimeout(r, 6500));
console.log('a los 7 s:', await p.evaluate(() => window.__pv_info().alarmas));
await b.close(); srv.close();
