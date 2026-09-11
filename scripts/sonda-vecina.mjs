// Sonda: la vecina del quinto se asoma y tira la maceta; un cani te levanta la moto y sale en el
// minimapa; el taller de chapa y pintura existe y quita las estrellas por 100 €.
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
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=${barrio}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await dormir(1500);
// La vecina: de noche, pegado a un bloque (el arranque suele tenerlos al lado); si no, se busca uno.
await p.evaluate(() => window.__pv_prueba.hora(23.5));
let asomada = await p.evaluate(() => window.__pv_prueba.vecina());
if (!asomada) {
  const bloque = await p.evaluate(() => { const b = window.__pv_barrios; void b; return null; });
  void bloque;
  for (const [dx, dz] of [[20, 0], [-20, 0], [0, 20], [0, -20], [40, 40], [-40, -40], [60, 0], [0, 60]]) {
    await p.evaluate(([x, z]) => { const i = window.__pv_info(); window.__pv_prueba.irA(i.vehiculo[0] + x, i.vehiculo[1] + z); }, [dx, dz]);
    await dormir(200);
    asomada = await p.evaluate(() => window.__pv_prueba.vecina());
    if (asomada) break;
  }
}
console.log('vecina asomada:', asomada, 'grito:', await aviso());
let fases = [];
for (let i = 0; i < 40; i++) { await dormir(500); const f = await p.evaluate(() => window.__pv_prueba.vecinaFase()); if (fases[fases.length - 1] !== f) fases.push(f); if (f === 'dentro' && fases.length > 1) break; }
const salud0 = await p.evaluate(() => window.__pv_info().salud);
console.log('fases:', fases.join(' → '), 'tras la maceta:', await aviso(), 'salud', salud0);
await p.screenshot({ path: 'logs/captura-vecina.png' });
// Moto levantada: bájate, aléjate y fuerza el robo.
await p.keyboard.press('e'); await dormir(300);
const info1 = await p.evaluate(() => window.__pv_info());
console.log('a pie:', info1.aPie);
const levantada = await p.evaluate(() => window.__pv_prueba.levantar());
await dormir(500);
console.log('levantada:', levantada, JSON.stringify(await p.evaluate(() => window.__pv_prueba.chapa())), 'aviso:', await aviso());
await dormir(2500);
const motero = await p.evaluate(() => window.__pv_prueba.chapa().motero);
console.log('el motero se mueve:', JSON.stringify(motero));
// Recuperarla: robarMotero coge el primero de la lista; el nuestro es el último, así que vamos a por él.
const recuperada = await p.evaluate(() => { const m = window.__pv_prueba.moteros(); const ultimo = m[m.length - 1]; window.__pv_prueba.irA(ultimo.x, ultimo.z); return window.__pv_prueba.robarMotero(); });
console.log('robarMotero (el primero):', recuperada, 'aviso:', await aviso());
// Chapa y pintura: con estrellas y dinero, al anillo.
await p.evaluate(() => { window.__pv_prueba.calor(200); window.__pv_prueba.dinero(500); });
const taller = await p.evaluate(() => window.__pv_prueba.chapa().taller);
console.log('taller:', JSON.stringify(taller));
if (taller) {
  const antes = await p.evaluate(() => ({ aPie: window.__pv_info().aPie, enCoche: window.__pv_info().enCoche, estrellas: window.__pv_info().estrellas }));
  if (antes.aPie) { await p.keyboard.press('e'); await dormir(300); }
  await p.evaluate(([x, z]) => window.__pv_prueba.irA(x, z), [taller.x, taller.z]);
  await dormir(600);
  console.log('llegas:', await aviso(), JSON.stringify(antes));
  await dormir(5000);
  const despues = await p.evaluate(() => ({ estrellas: window.__pv_info().estrellas, calor: window.__pv_info().calor, dinero: document.querySelector('#hud-dinero').textContent, aPie: window.__pv_info().aPie }));
  console.log('tras chapa:', JSON.stringify(despues), 'aviso:', await aviso());
  await p.screenshot({ path: 'logs/captura-chapa.png' });
}
console.log(errores.length ? `ERRORES: ${errores.slice(0, 3).join('\n')}` : 'sin errores');
await b.close(); srv.close();
process.exit(errores.length ? 1 : 0);
