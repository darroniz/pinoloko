// Sonda: conducir con estilo y el barrio que se venga. Fuerza un caballito (a fondo desde parado),
// una derrapada (freno girando a velocidad), mira los eventos en el dinero y las estadísticas; luego
// saca al camarero y al motero y comprueba que persiguen y alcanzan a un Wifly parado.
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
await p.evaluate(() => { window.__pv_prueba.hora(12); window.__pv_prueba.dinero(0); });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const dinero = () => p.evaluate(() => document.querySelector('#hud-dinero')?.textContent);
const aviso = () => p.evaluate(() => document.querySelector('#aviso').textContent);
// Caballito: a fondo hacia el norte desde parado, en una calle rodada.
const arranque = await p.evaluate(() => window.__pv_prueba.paradaLlegada());
await p.evaluate(() => window.__pv_prueba.forzarEje(0, -1));
let mejor = 0;
for (let i = 0; i < 40; i++) { await dormir(150); const e = await p.evaluate(() => window.__pv_prueba.estilo()); mejor = Math.max(mejor, e.caballito); }
await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
await dormir(1500);
console.log('caballito máximo en curso:', mejor.toFixed(2), 's · aviso:', await aviso(), '· dinero:', await dinero());
// Derrapada: a velocidad, freno + giro mantenido.
await p.evaluate(() => window.__pv_prueba.empujar(9, -13));
await p.keyboard.down('Space');
await p.evaluate(() => window.__pv_prueba.forzarEje(1, -0.3));
let derr = 0;
for (let i = 0; i < 30; i++) { await dormir(120); const e = await p.evaluate(() => window.__pv_prueba.estilo()); derr = Math.max(derr, e.derrape); }
await p.keyboard.up('Space');
await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
await dormir(1500);
console.log('derrape máximo en curso:', derr.toFixed(2), 's · aviso:', await aviso(), '· dinero:', await dinero());
await p.screenshot({ path: 'logs/captura-estilo.png' });
// Camarero: sale a 9 m y alcanza a Wifly parado.
console.log('camarero sale:', await p.evaluate(() => window.__pv_prueba.perseguir('camarero')));
let alcanzado = false;
for (let i = 0; i < 60 && !alcanzado; i++) { await dormir(500); const l = await p.evaluate(() => window.__pv_prueba.perseguidores()); if (i % 6 === 0) console.log('  perseguidores:', JSON.stringify(l)); alcanzado = l.length === 0; }
console.log('tras el camarero:', await aviso(), '· dinero:', await dinero());
await p.screenshot({ path: 'logs/captura-camarero.png' });
// Motero: Wifly parado en su moto; al alcanzarlo se la lleva (moto levantada).
console.log('motero sale:', await p.evaluate(() => window.__pv_prueba.perseguir('motero')));
alcanzado = false;
for (let i = 0; i < 60 && !alcanzado; i++) { await dormir(500); const l = await p.evaluate(() => window.__pv_prueba.perseguidores()); alcanzado = l.length === 0; }
await dormir(500);
console.log('tras el motero:', await aviso(), '· chapa/levantada:', JSON.stringify(await p.evaluate(() => window.__pv_prueba.chapa())), '· info aPie:', await p.evaluate(() => window.__pv_info().aPie));
await p.screenshot({ path: 'logs/captura-motero.png' });
// El dueño del coche: Wifly roba un coche del tráfico, se queda parado y el dueño lo saca.
console.log('coche robado:', await p.evaluate(() => window.__pv_prueba.robarCoche()));
await dormir(800);
console.log('dueño sale:', await p.evaluate(() => window.__pv_prueba.perseguir('dueno')));
alcanzado = false;
for (let i = 0; i < 60 && !alcanzado; i++) { await dormir(500); const l = await p.evaluate(() => window.__pv_prueba.perseguidores()); alcanzado = l.length === 0; }
await dormir(500);
console.log('tras el dueño:', await aviso(), '· aPie:', await p.evaluate(() => window.__pv_info().aPie), '· enCoche:', await p.evaluate(() => window.__pv_info().enCoche));
console.log('arranque', JSON.stringify(arranque));
await b.close(); srv.close();
