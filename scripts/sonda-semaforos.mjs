// Sonda: en Triana, se planta ante un cruce con semáforos y comprueba que el tráfico para en rojo.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${srv.address().port}/?barrio=${process.argv[2] ?? 'triana'}`;
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await p.goto(url, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => window.__pv_prueba.hora(14));
const cruces = await p.evaluate(() => window.__pv_prueba.semaforos());
console.log('cruces', JSON.stringify(cruces));
const c = cruces[0];
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x + 6, z + 10, 0), [c.x, c.z]);
for (let i = 0; i < 4; i++) {
  await new Promise((r) => setTimeout(r, 4000));
  const info = await p.evaluate(() => { const i = window.__pv_info(); return { luces: window.__pv_prueba.semaforos().map((c) => c.luz), trafico: i.trafico }; });
  console.log(i, JSON.stringify(info));
  await p.screenshot({ path: `logs/captura-semaforo-${i}.png` });
}
await b.close(); srv.close();
