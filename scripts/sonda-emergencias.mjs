// Sonda: revientas la moto, vienen los bomberos por la calle, la apagan y se van; una racha de
// atropellos trae al 061; y alrededor se forma el corro de mirones.
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
const errores = [];
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push(String(e)));
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const aviso = () => p.evaluate(() => document.querySelector('#aviso').textContent);
const emergencias = () => p.evaluate(() => window.__pv_prueba.emergencias());
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=${barrio}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await dormir(1500);
console.log('llamar bomberos:', await p.evaluate(() => window.__pv_prueba.llamar('bomberos')), 'ambulancia:', await p.evaluate(() => window.__pv_prueba.llamar('ambulancia')));
const estados = new Set();
let ultimo = null;
for (let i = 0; i < 120; i++) {
  await dormir(1000);
  const e = await emergencias();
  for (const s of e) estados.add(`${s.tipo}:${s.estado}`);
  const clave = JSON.stringify(e.map((s) => [s.tipo, s.estado]));
  if (clave !== ultimo) { ultimo = clave; console.log(`  t=${i}s`, JSON.stringify(e), 'aviso:', await aviso(), 'mirando:', await p.evaluate(() => window.__pv_info().mirando)); }
  if (!e.length) break;
}
console.log('estados vistos:', [...estados].join(' '));
await p.screenshot({ path: 'logs/captura-emergencias.png' });
console.log(errores.length ? `ERRORES: ${errores.slice(0, 3).join('\n')}` : 'sin errores');
await b.close(); srv.close();
process.exit(errores.length ? 1 : 0);
