// Sonda de robustez: juega al azar un rato (conducir, frenar, bajarse, subirse, robar, chocar,
// cambiar de barrio, abrir el menú, de día y de noche) y comprueba que no salta ningún error.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errores = [];
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
p.on('pageerror', (e) => errores.push(String(e)));
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=${process.argv[2] ?? 'pino-montano'}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
const rnd = (() => { let s = Number(process.argv[3] ?? 7); return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
const teclas = ['w', 'a', 's', 'd', 'Space', 'h'];
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
let paso = 0;
while (Date.now() - t0 < Number(process.argv[4] ?? 60000)) {
  paso++;
  const r = rnd();
  if (r < 0.55) { const k = teclas[Math.floor(rnd() * teclas.length)]; await p.keyboard.down(k); await dormir(300 + rnd() * 900); await p.keyboard.up(k); }
  else if (r < 0.65) { await p.keyboard.press('e'); await dormir(300); }
  else if (r < 0.72) { await p.evaluate(() => window.__pv_prueba.calor(Math.random() * 520)); }
  else if (r < 0.78) { await p.evaluate(() => window.__pv_prueba.hora(Math.random() * 24)); }
  else if (r < 0.83) { await p.evaluate((vx) => window.__pv_prueba.empujar(vx, -12), (rnd() - 0.5) * 20); await dormir(600); }
  else if (r < 0.87) { await p.keyboard.press('Escape'); await dormir(200); const pest = ['mapa', 'garaje', 'logros', 'estadisticas', 'ayuda'][Math.floor(rnd() * 5)]; if (await p.evaluate(() => document.querySelector('#menu.visible') !== null)) { await p.click(`#menu [data-pestana="${pest}"]`, { timeout: 3000 }).catch(() => {}); await dormir(200); await p.keyboard.press('Escape'); } }
  else if (r < 0.9) { await p.evaluate(() => window.__pv_prueba.robarMotero()); }
  else if (r < 0.93) { await p.evaluate(() => window.__pv_prueba.robarCoche()); }
  else if (r < 0.95) { await p.keyboard.press('p'); await dormir(300); }
  else if (r < 0.97) { await p.keyboard.press('r'); }
  else { const a = await p.evaluate(() => window.__pv_prueba.viajar()); console.log('  viaje →', a); }
  if (errores.length) break;
}
const info = await p.evaluate(() => { const i = window.__pv_info(); return { barrio: i.barrio, frames: window.__pv_frames, dinero: document.getElementById('hud-dinero').textContent, estrellas: i.estrellas, aPie: i.aPie, enCoche: i.enCoche, cuerpos: i.cuerpos, dentroEdificio: i.dentroEdificio }; });
console.log(`pasos ${paso} · ${JSON.stringify(info)}`);
console.log(errores.length ? `ERRORES (${errores.length}):\n${errores.slice(0, 5).join('\n')}` : 'sin errores');
await b.close(); srv.close();
process.exit(errores.length ? 1 : 0);
