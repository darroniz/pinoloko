// Sonda: la lluvia (?lluvia=1): cielo gris, cortina, charcos visibles, menos agarre; pisar un charco salpica.
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
await p.goto(`${base}/?barrio=pino-montano&lluvia=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => { window.__pv_prueba.hora(12); window.__pv_prueba.dinero(0); });
let ll = null;
for (let i = 0; i < 40; i++) { await dormir(1000); ll = await p.evaluate(() => window.__pv_prueba.lluvia()); if (ll.intensidad >= 1) break; }
console.log('lluvia:', JSON.stringify(ll), '· hora:', await p.evaluate(() => document.querySelector('#hud-hora').textContent));
await p.screenshot({ path: 'logs/captura-lluvia.png' });
// Un charco: ir a 8 m y pasar por encima a fondo.
const charcos = await p.evaluate(() => window.__pv_prueba.charcos());
console.log('charcos:', charcos.length);
const [cx, cz] = charcos[0];
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x - 9, z, Math.PI / 2), [cx, cz]);
await dormir(600);
const antes = await p.evaluate(() => window.__pv_prueba.stats().charcos);
await p.evaluate(() => { window.__pv_prueba.forzarEje(1, 0); window.__pv_prueba.empujar(12, 0); });
let pisados = antes;
for (let i = 0; i < 12 && pisados === antes; i++) { await dormir(400); pisados = await p.evaluate(() => window.__pv_prueba.stats().charcos); }
await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
await p.screenshot({ path: 'logs/captura-charco.png' });
console.log('charcos pisados antes/después:', antes, pisados, '· salpicados:', await p.evaluate(() => window.__pv_prueba.stats().salpicados), '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
console.log('estado final:', JSON.stringify(await p.evaluate(() => window.__pv_prueba.lluvia())));
await b.close(); srv.close();
