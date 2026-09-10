// Sonda: patada a pie. Wifly se baja junto a un cono, se pone mirando hacia él, pulsa ESPACIO y
// el cono tiene que salir volando (derribado, dinero). Captura en logs/captura-patada.png.
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
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=pino-montano`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => window.__pv_prueba.hora(12));
await new Promise((r) => setTimeout(r, 800));
const conos = await p.evaluate(() => window.__pv_prueba.trastos('cono'));
const [cx, cz] = conos[2];
// La moto a 4 m al sur del cono; Wifly se baja y anda hacia el norte hasta tenerlo delante.
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x, z + 4, 0), [cx, cz]);
await new Promise((r) => setTimeout(r, 600));
await p.keyboard.press('e');
await new Promise((r) => setTimeout(r, 600));
let pos = await p.evaluate(() => window.__pv_info().peaton);
for (let i = 0; i < 25 && Math.hypot(pos[0] - cx, pos[1] - cz) > 1.3; i++) {
  const dx = cx - pos[0], dz = cz - pos[1], l = Math.hypot(dx, dz);
  await p.evaluate(([ex, ez]) => window.__pv_prueba.forzarEje(ex, ez), [dx / l, -dz / l]);
  await new Promise((r) => setTimeout(r, 150));
  pos = await p.evaluate(() => window.__pv_info().peaton);
}
await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
await new Promise((r) => setTimeout(r, 250));
console.log('a', Math.hypot(pos[0] - cx, pos[1] - cz).toFixed(2), 'm del cono; dinero antes:', await p.evaluate(() => document.getElementById('hud-dinero').textContent));
await p.keyboard.press('Space');
await new Promise((r) => setTimeout(r, 350));
await p.screenshot({ path: 'logs/captura-patada.png' });
await new Promise((r) => setTimeout(r, 900));
const conosDespues = await p.evaluate(() => window.__pv_prueba.trastos('cono'));
const movido = conosDespues.findIndex(([x, z]) => Math.hypot(x - cx, z - cz) > 1.5 && Math.hypot(x - cx, z - cz) < 15);
console.log('cono movido:', movido >= 0, 'dinero después:', await p.evaluate(() => document.getElementById('hud-dinero').textContent), 'aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
await b.close(); srv.close();
