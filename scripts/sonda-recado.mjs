// Sonda del Recadero: coge un encargo en moto, se planta en el destino y comprueba la cadena.
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
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await p.goto(url, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => window.__pv_prueba.hora(12));
const r0 = await p.evaluate(() => window.__pv_prueba.recado());
console.log('puntos', JSON.stringify(r0.puntos));
const pt = r0.puntos[0];
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x, z + 8, 0), [pt.x, pt.z]);
await new Promise((r) => setTimeout(r, 1500));
await p.screenshot({ path: 'logs/captura-recado-0.png' });
await p.keyboard.down('w');
await new Promise((r) => setTimeout(r, 2500));
await p.keyboard.up('w');
let r1 = await p.evaluate(() => window.__pv_prueba.recado());
console.log('tras pasar por la bolsa', JSON.stringify({ estado: r1.estado, destino: r1.destino, restante: Math.round(r1.restante) }));
if (r1.estado !== 'en_curso') { console.log('FALLO: no arranca el encargo'); }
await p.screenshot({ path: 'logs/captura-recado-1.png' });
for (let i = 0; i < 2 && r1.estado === 'en_curso'; i++) {
  await p.evaluate(([x, z]) => window.__pv_prueba.irA(x, z, 0), [r1.destino.x, r1.destino.z]);
  await new Promise((r) => setTimeout(r, 1200));
  const r2 = await p.evaluate(() => window.__pv_prueba.recado());
  console.log(`entrega ${i + 1}`, JSON.stringify({ estado: r2.estado, destino: r2.destino?.nombre, cadena: r2.cadena, restante: Math.round(r2.restante) }));
  r1 = r2;
}
await p.screenshot({ path: 'logs/captura-recado-2.png' });
console.log('info', JSON.stringify(await p.evaluate(() => { const i = window.__pv_info(); return { dinero: document.getElementById('hud-dinero').textContent, hud: document.getElementById('hud-carrera').textContent, aviso: document.getElementById('aviso').textContent, render: i.render }; })));
await b.close(); srv.close();
