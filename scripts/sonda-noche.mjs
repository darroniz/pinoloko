// Sonda: noche (ventanas encendidas) y control policial a dos estrellas.
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
await p.evaluate(() => window.__pv_prueba.hora(22.5));
await p.keyboard.down('w'); await new Promise((r) => setTimeout(r, 3000)); await p.keyboard.up('w');
console.log('ventanas visibles:', await p.evaluate(() => window.__pv_escena.getObjectByName('ventanas')?.visible), 'rótulos:', await p.evaluate(() => window.__pv_escena.getObjectByName('rotulos')?.children.length));
await p.screenshot({ path: `logs/captura-noche-${barrio}.png` });
await p.evaluate(() => window.__pv_prueba.hora(12));
await p.evaluate(() => window.__pv_prueba.calor(150));
await p.keyboard.down('w');
for (let i = 0; i < 12; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const info = await p.evaluate(() => { const i = window.__pv_info(); return { estrellas: i.estrellas, patrullas: i.patrullas.map((q) => [q[0], q[7]]) }; });
  if (info.patrullas.some((q) => q[0] === 'control')) { console.log('control a los', i + 1, 's:', JSON.stringify(info)); break; }
  if (i === 11) console.log('sin control:', JSON.stringify(info));
}
await p.keyboard.up('w');
await p.screenshot({ path: `logs/captura-control.png` });
await b.close(); srv.close();
