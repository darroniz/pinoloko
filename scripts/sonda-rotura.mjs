// Sonda: embestir una maceta y una caja del mercado y comprobar que se rompen en trozos.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = '/home/idarroniz/pinoloko/dist';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await p.goto(`http://127.0.0.1:${srv.address().port}/`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await new Promise((r) => setTimeout(r, 800));
for (const tipo of ['maceta', 'caja']) {
  const lista = await p.evaluate((t) => window.__pv_prueba.trastos(t), tipo);
  const [x, z] = lista[Math.floor(lista.length / 2)];
  await p.evaluate(([a, c]) => window.__pv_prueba.irA(a, c + 7, 0), [x, z]);
  await new Promise((r) => setTimeout(r, 700));
  await p.evaluate(() => { window.__pv_prueba.empujar(0, -12); window.__pv_prueba.forzarEje(0, 1); });
  let mejor = 0;
  for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 150)); const info = await p.evaluate(() => { const i = window.__pv_info(); return { trozos: i.trozos, rotos: i.rotos }; }); mejor = Math.max(mejor, info.trozos); if (info.trozos > 0 && i > 3) break; }
  await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
  const info = await p.evaluate(() => { const i = window.__pv_info(); return { trozos: i.trozos, rotos: i.rotos }; });
  console.log(tipo, 'trozos máx', mejor, JSON.stringify(info), 'aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
  await p.screenshot({ path: `logs/captura-rotura-${tipo}.png` });
}
await b.close(); srv.close();
