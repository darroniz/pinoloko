// Sonda: pinta de los vecinos por barrio (gorras, gorros) y pestaña de logros del menú.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}/`;
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
for (const barrio of process.argv.slice(2).length ? process.argv.slice(2) : ['alameda', 'pino-montano']) {
  await p.goto(`${base}?barrio=${barrio}`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
  await p.click('#boton-jugar');
  await p.evaluate(() => window.__pv_prueba.hora(12));
  await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
  // Bajarse y acercarse a los vecinos: la cámara a pie está más cerca.
  await p.keyboard.press('e');
  await new Promise((r) => setTimeout(r, 2500));
  console.log(barrio, JSON.stringify(await p.evaluate(() => { const i = window.__pv_info(); return { vecinosCerca: i.vecinosCerca, aPie: i.aPie }; })));
  await p.screenshot({ path: `logs/captura-tribu-${barrio}.png` });
}
await p.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 400));
await p.click('#menu [data-pestana="logros"]');
await new Promise((r) => setTimeout(r, 300));
await p.screenshot({ path: 'logs/captura-logros.png' });
console.log('logros', await p.evaluate(() => document.querySelectorAll('#menu .logro').length), 'hechos', await p.evaluate(() => document.querySelectorAll('#menu .logro.hecho').length));
await b.close(); srv.close();
