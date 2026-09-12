// Sonda: quitarle el Sevici a un ciclista (a pie, E) y el fantasma del récord: corre una carrera
// dos veces (teletransporte por los puntos) y en la segunda tiene que estar el fantasma corriendo.
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
await dormir(800);
console.log('sevici robado:', await p.evaluate(() => window.__pv_prueba.robarSevici()), '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
await p.evaluate(() => window.__pv_prueba.forzarEje(0, -1));
await dormir(3000);
await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
console.log('en Sevici a fondo:', JSON.stringify(await p.evaluate(() => { const i = window.__pv_info(); return { velocidad: Math.round(i.vehiculo[2] * 10) / 10, aPie: i.aPie }; })));
await p.screenshot({ path: 'logs/captura-sevici.png' });
// Carrera dos veces: la segunda con fantasma.
await p.evaluate(() => window.__pv_prueba.hora(12));
const ruta = (await p.evaluate(() => window.__pv_prueba.carreras()))[0];
for (let vuelta = 0; vuelta < 2; vuelta++) {
  await p.evaluate(([x, z]) => window.__pv_prueba.irA(x, z), ruta[ruta.length - 1]);
  await dormir(800);
  const fantasma = await p.evaluate(() => { const g = window.__pv_escena.getObjectByName('fantasma'); return g ? g.children[0].visible : null; });
  console.log('vuelta', vuelta, '· carrera:', (await p.evaluate(() => window.__pv_prueba.carrera())).estado, '· fantasma visible:', fantasma, '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
  for (const [x, z] of ruta) { await p.evaluate(([a, c]) => window.__pv_prueba.irA(a, c), [x, z]); await dormir(500); }
  await dormir(500);
  console.log('  meta:', await p.evaluate(() => document.querySelector('#aviso').textContent));
  await dormir(9000);
}
await b.close(); srv.close();
