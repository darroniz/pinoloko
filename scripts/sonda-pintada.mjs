// Sonda: pintada. Wifly se baja junto a un bote de spray, pulsa E, espera y comprueba que la
// pintada queda hecha y guardada. Captura en logs/captura-pintada.png.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const barrio = process.argv[2] ?? 'pino-montano';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=${barrio}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => window.__pv_prueba.hora(12));
await new Promise((r) => setTimeout(r, 800));
const info = await p.evaluate(() => window.__pv_prueba.pintadas());
console.log('puntos:', JSON.stringify(info.puntos.map(([x, z]) => [Math.round(x), Math.round(z)])), 'hechas:', JSON.stringify(info.hechas));
const [px, pz] = info.puntos[0];
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x + 1.5, z, 0), [px, pz]);
await new Promise((r) => setTimeout(r, 700));
await p.keyboard.press('e'); // bajarse
await new Promise((r) => setTimeout(r, 700));
let pos = await p.evaluate(() => window.__pv_info().peaton);
console.log('a pie en', pos.map((v) => Math.round(v * 10) / 10), 'distancia', Math.hypot(pos[0] - px, pos[1] - pz).toFixed(1));
// Anda hacia el bote si hace falta.
for (let i = 0; i < 20 && Math.hypot(pos[0] - px, pos[1] - pz) > 1.5; i++) {
  const dx = px - pos[0], dz = pz - pos[1], l = Math.hypot(dx, dz);
  await p.evaluate(([ex, ez]) => window.__pv_prueba.forzarEje(ex, ez), [dx / l, -dz / l]);
  await new Promise((r) => setTimeout(r, 200));
  pos = await p.evaluate(() => window.__pv_info().peaton);
}
await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
await new Promise((r) => setTimeout(r, 300));
await p.keyboard.press('e'); // firmar
await new Promise((r) => setTimeout(r, 900));
const mitad = await p.evaluate(() => window.__pv_prueba.pintadas());
console.log('a medias: firmando', mitad.firmando, 'progreso', mitad.progreso.toFixed(2), 'aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
await p.screenshot({ path: 'logs/captura-pintada-firmando.png' });
await new Promise((r) => setTimeout(r, 1800));
const fin = await p.evaluate(() => window.__pv_prueba.pintadas());
console.log('hechas:', JSON.stringify(fin.hechas), 'aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent), 'dinero:', await p.evaluate(() => document.getElementById('hud-dinero').textContent), 'guardado:', await p.evaluate((k) => localStorage.getItem(`pinoloko.pintadas.${k}.v1`), barrio), 'calor:', await p.evaluate(() => window.__pv_info().calor));
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x + 5, z + 7, 0), [px, pz]);
await new Promise((r) => setTimeout(r, 1200));
await p.screenshot({ path: 'logs/captura-pintada.png' });
await b.close(); srv.close();
