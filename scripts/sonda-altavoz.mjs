// Sonda: el altavoz de la moto (comitiva de canis en Pino Montano, quejas en Los Remedios) y las
// palomas (despegan al pasar y vuelven a posarse). Captura para verlas.
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
const base = `http://127.0.0.1:${srv.address().port}`;
async function abrir(barrio) {
  await p.goto(`${base}/?barrio=${barrio}`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
  await p.click('#boton-jugar');
  await p.evaluate(() => { window.__pv_prueba.hora(12); window.__pv_prueba.dinero(0); });
  await dormir(1000);
}
// 1) Palomas en el Mercado: ir junto a la bandada, pasar por medio y ver que despegan y vuelven.
await abrir('pino-montano');
let pal = await p.evaluate(() => window.__pv_prueba.palomas());
console.log('bandadas:', JSON.stringify(pal));
const casa = pal[0];
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x - 10, z, Math.PI / 2), [casa.x, casa.z]);
await dormir(800);
await p.screenshot({ path: 'logs/captura-palomas-suelo.png' });
await p.evaluate(() => { window.__pv_prueba.forzarEje(1, 0); window.__pv_prueba.empujar(10, 0); });
for (let i = 0; i < 10; i++) { await dormir(400); pal = await p.evaluate(() => window.__pv_prueba.palomas()); if (pal[0].estado !== 'suelo') break; }
await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
console.log('tras pasar:', JSON.stringify(pal[0]), '· dinero:', await p.evaluate(() => document.querySelector('#hud-dinero').textContent));
await dormir(1500);
await p.screenshot({ path: 'logs/captura-palomas-vuelo.png' });
for (let i = 0; i < 40; i++) { await dormir(1000); pal = await p.evaluate(() => window.__pv_prueba.palomas()); if (pal[0].estado === 'suelo') break; }
console.log('al rato:', JSON.stringify(pal[0]));
// 2) Altavoz: en Pino Montano, encender y esperar a que se apunten canis.
await abrir('pino-montano');
const vecinos = await p.evaluate(() => window.__pv_prueba.vecinos());
console.log('vecinos paseando:', vecinos.length);
const v0 = vecinos[0];
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x - 3, z, 0), [v0.x, v0.z]);
await dormir(500);
const est = await p.evaluate(() => window.__pv_prueba.encenderAltavoz());
console.log('altavoz encendido:', est, '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
let alt = null;
for (let i = 0; i < 30; i++) { await dormir(1000); alt = await p.evaluate(() => window.__pv_prueba.altavoz()); if (alt.cuantos >= 3) break; }
console.log('comitiva:', JSON.stringify(alt), '· dinero:', await p.evaluate(() => document.querySelector('#hud-dinero').textContent));
await dormir(4000);
alt = await p.evaluate(() => window.__pv_prueba.altavoz());
console.log('comitiva al rato:', JSON.stringify(alt));
await p.screenshot({ path: 'logs/captura-altavoz.png' });
// Se va lejos a toda pastilla: la comitiva se pierde.
await p.evaluate(() => { window.__pv_prueba.forzarEje(0, 1); window.__pv_prueba.empujar(0, -18); });
for (let i = 0; i < 12; i++) { await dormir(1000); alt = await p.evaluate(() => window.__pv_prueba.altavoz()); if (alt.cuantos === 0) break; }
await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
console.log('tras irse lejos:', JSON.stringify(alt), '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
// 3) En Los Remedios protestan.
if (!process.argv[2]) {
  await abrir('los-remedios');
  await p.evaluate(() => window.__pv_prueba.encenderAltavoz());
  let aviso = '';
  for (let i = 0; i < 25; i++) { await dormir(1000); aviso = await p.evaluate(() => document.querySelector('#aviso').textContent); if (aviso.startsWith('Un vecino')) break; }
  console.log('Los Remedios:', aviso, JSON.stringify(await p.evaluate(() => window.__pv_prueba.altavoz())));
}
await b.close(); srv.close();
