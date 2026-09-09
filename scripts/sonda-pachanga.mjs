// Sonda: se planta junto a una pachanga, mira a los niños, chuta el balón con la moto y busca el gol.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${srv.address().port}/?barrio=${process.argv[2] ?? 'pino-montano'}`;
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: Number(process.argv[3] ?? 1) });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await p.goto(url, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => window.__pv_prueba.hora(12));
const pach = await p.evaluate(() => window.__pv_prueba.pachangas());
console.log('pachangas', JSON.stringify(pach.map((q) => ({ x: Math.round(q.x), z: Math.round(q.z), goles: q.goles }))));
const q = pach[0];
// Detrás del balón respecto a la portería, mirando a la portería.
const dx = q.porteria.x - q.x, dz = q.porteria.z - q.z; const d = Math.hypot(dx, dz);
const rumbo = Math.atan2(dx / d, -dz / d);
await p.evaluate(([x, z, r]) => window.__pv_prueba.irA(x, z, r), [q.x - (dx / d) * 6, q.z - (dz / d) * 6, rumbo]);
await new Promise((r) => setTimeout(r, 2500));
await p.screenshot({ path: 'logs/captura-pachanga-0.png' });
// Acelerar hacia la portería (eje en pantalla: la dirección de la portería).
await p.evaluate(([ex, ey]) => window.__pv_prueba.forzarEje(ex, ey), [dx / d, -dz / d]);
for (let i = 0; i < 3; i++) { await new Promise((r) => setTimeout(r, 800)); console.log('  en marcha', JSON.stringify(await p.evaluate(() => { const i = window.__pv_info(); return { eje: i.eje, v: i.vehiculo.map((n) => Math.round(n * 10) / 10), rumbo: Math.round(i.scooter.rumbo * 100) / 100, aPie: i.aPie, montada: i.scooter.montada }; }))); }
await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
await new Promise((r) => setTimeout(r, 2500));
const despues = await p.evaluate(() => window.__pv_prueba.pachangas());
console.log('tras el chut', JSON.stringify({ goles: despues[0].goles, balon: despues[0].balon.map((n) => Math.round(n * 10) / 10), dinero: await p.evaluate(() => document.querySelector('#hud-dinero')?.textContent) }));
console.log('aviso', await p.evaluate(() => document.getElementById('aviso').textContent));
await p.screenshot({ path: 'logs/captura-pachanga-1.png' });
console.log(JSON.stringify(await p.evaluate(() => { const i = window.__pv_info(); return { cuerpos: i.cuerpos, despiertos: i.despiertos }; })));
await b.close(); srv.close();
