// Sonda: el mercadillo junto al Mercado (puestos con toldo), una furgoneta del tráfico y las pistas.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${srv.address().port}/?barrio=pino-montano`;
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await p.goto(url, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => window.__pv_prueba.hora(11));
const puestos = await p.evaluate(() => window.__pv_prueba.trastos('puesto'));
console.log('puestos', puestos.length, JSON.stringify(puestos.slice(0, 3)));
const [px, pz] = puestos[Math.floor(puestos.length / 2)];
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x + 4, z + 6, 0), [px, pz]);
await new Promise((r) => setTimeout(r, 2000));
await p.screenshot({ path: 'logs/captura-mercadillo.png' });
console.log('pista', await p.evaluate(() => document.getElementById('aviso').textContent));
// Embestir un puesto.
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x, z + 5, 0), [px, pz]);
await p.evaluate(() => window.__pv_prueba.empujar(0, -12));
await new Promise((r) => setTimeout(r, 1500));
console.log('tras embestir', JSON.stringify(await p.evaluate(() => ({ aviso: document.getElementById('aviso').textContent, rotos: window.__pv_info().rotos, dinero: document.getElementById('hud-dinero').textContent }))));
await p.screenshot({ path: 'logs/captura-mercadillo-2.png' });
// Furgoneta: ¿hay alguna en el tráfico y se puede robar?
console.log('furgoneta robada', await p.evaluate(() => {
  const info = window.__pv_info();
  return { trafico: info.trafico };
}));
await b.close(); srv.close();
