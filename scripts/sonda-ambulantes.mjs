// Sonda: el camión del butano y la furgoneta del chatarrero en el tráfico; embestir el butanero suelta
// bombonas que ruedan y pagan; robar el chatarrero da la furgoneta con nombre.
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
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=pino-montano`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(() => { window.__pv_prueba.hora(12); window.__pv_prueba.dinero(0); });
await dormir(800);
const amb = await p.evaluate(() => window.__pv_prueba.ambulantes());
console.log('ambulantes:', JSON.stringify(amb));
const butano = amb.find((c) => c.variante === 'butano');
if (butano) {
  // Embestir al butanero por detrás a toda pastilla.
  // De frente: la moto 7 m por delante del camión, lanzada contra él.
  await p.evaluate(([x, z, r]) => { window.__pv_prueba.irA(x + Math.sin(r) * 7, z - Math.cos(r) * 7, r + Math.PI); }, [butano.x, butano.z, butano.rumbo]);
  await dormir(500);
  await p.evaluate(([r]) => window.__pv_prueba.empujar(-Math.sin(r) * 14, Math.cos(r) * 14), [butano.rumbo]);
  await dormir(2500);
  console.log('tras embestir:', await p.evaluate(() => document.querySelector('#aviso').textContent), '· bombonas en el suelo:', (await p.evaluate(() => window.__pv_prueba.trastos('bombona'))).length, '· dinero:', await p.evaluate(() => document.querySelector('#hud-dinero').textContent), '· carga:', JSON.stringify(await p.evaluate(() => window.__pv_prueba.ambulantes())));
  await dormir(1500);
  await p.screenshot({ path: 'logs/captura-butano.png' });
}
console.log('soltar bombonas (carga que queda):', await p.evaluate(() => window.__pv_prueba.probarButano()));
await dormir(3000);
console.log('bombonas en el suelo:', (await p.evaluate(() => window.__pv_prueba.trastos('bombona'))).length, '· dinero:', await p.evaluate(() => document.querySelector('#hud-dinero').textContent), '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
await p.screenshot({ path: 'logs/captura-bombonas.png' });
console.log('robar chatarrero:', await p.evaluate(() => window.__pv_prueba.robarAmbulante('chatarrero')), '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
await dormir(600);
await p.screenshot({ path: 'logs/captura-chatarrero.png' });
await b.close(); srv.close();
