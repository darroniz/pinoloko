// Sonda: la ola de calor (?calor=1&lluvia=0): calima, abanicos, "· calor" en la hora; y el público de la comitiva.
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
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=pino-montano&calor=1&lluvia=0`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => { window.__pv_prueba.hora(15); window.__pv_prueba.dinero(0); });
let hora = '';
for (let i = 0; i < 30; i++) { await dormir(1000); hora = await p.evaluate(() => document.querySelector('#hud-hora').textContent); if (hora.includes('calor')) break; }
console.log('hora:', hora, '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
const vecinos = await p.evaluate(() => window.__pv_prueba.vecinos());
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x - 4, z, 0), [vecinos[0].x, vecinos[0].z]);
await dormir(1200);
await p.screenshot({ path: 'logs/captura-calor.png' });
await b.close(); srv.close();
