// Sonda: radar. La scooter pasa la raya a fondo y tiene que salir la foto multa (-50 €).
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const barrio = process.argv[2] ?? 'nervion';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=${barrio}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => { window.__pv_prueba.hora(12); window.__pv_prueba.dinero(200); });
await new Promise((r) => setTimeout(r, 800));
const radares = await p.evaluate(() => window.__pv_prueba.radares());
console.log('radares:', JSON.stringify(radares.map((r) => [Math.round(r.x), Math.round(r.z), r.calle])));
const r = radares[0];
// 20 m antes de la raya, en el eje de la calle, mirando hacia ella, y a fondo.
const rumbo = Math.atan2(r.tx, -r.tz);
await p.evaluate(([x, z, ru]) => window.__pv_prueba.irA(x, z, ru), [r.x - r.tx * 12, r.z - r.tz * 12, rumbo]);
await new Promise((r) => setTimeout(r, 400));
await p.evaluate(([vx, vz, ex, ez]) => { window.__pv_prueba.empujar(vx, vz); window.__pv_prueba.forzarEje(ex, ez); }, [r.tx * 17, r.tz * 17, r.tx, -r.tz]);
let aviso = '';
for (let i = 0; i < 20 && !aviso.includes('Foto multa'); i++) { await new Promise((r) => setTimeout(r, 120)); aviso = await p.evaluate(() => document.querySelector('#aviso').textContent); const v = await p.evaluate(() => window.__pv_info().vehiculo); console.log('  ', v.map((n) => Math.round(n * 10) / 10).join(' '), 'dist raya', Math.round(Math.hypot(v[0] - r.x, v[1] - r.z))); }
await p.screenshot({ path: 'logs/captura-radar.png' });
await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
console.log('aviso:', aviso, '· dinero:', await p.evaluate(() => document.getElementById('hud-dinero').textContent), '· calor:', await p.evaluate(() => window.__pv_info().calor));
await b.close(); srv.close();
