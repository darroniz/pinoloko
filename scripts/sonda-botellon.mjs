// Sonda: el botellón de la plaza (Pino Montano) y la afición del estadio (Nervión). Pone la hora,
// mira que el corro se forma, pasa por medio a toda pastilla y comprueba que se disuelve y paga.
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
async function corro(barrio, hora, gancho, captura) {
  await p.goto(`${base}/?barrio=${barrio}`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
  await p.click('#boton-jugar');
  await p.evaluate(([h]) => { window.__pv_prueba.hora(h); window.__pv_prueba.dinero(0); }, [hora]);
  await dormir(1500);
  let c = await p.evaluate((g) => window.__pv_prueba[g](), gancho);
  console.log(gancho, 'al empezar:', JSON.stringify(c));
  if (!c.sitio) return;
  await p.evaluate(([x, z]) => window.__pv_prueba.irA(x - 25, z), [c.sitio.x, c.sitio.z]);
  // Espera a que lleguen al corro (tiempo de juego lento en la sonda).
  for (let i = 0; i < 20; i++) { await dormir(1000); c = await p.evaluate((g) => window.__pv_prueba[g](), gancho); if (c.cuantos >= 3) break; }
  console.log(gancho, 'formado:', JSON.stringify(c));
  await p.evaluate(([x, z]) => window.__pv_prueba.irA(x, z + 6), [c.sitio.x, c.sitio.z]);
  await dormir(700);
  await p.screenshot({ path: captura });
  // Por medio a toda pastilla, varias pasadas (el tiempo de juego va lento en la sonda).
  for (let pasada = 0; pasada < 4 && !c.disuelto; pasada++) {
    const s = pasada % 2 ? -1 : 1;
    await p.evaluate(([x, z, s]) => { window.__pv_prueba.irA(x - 9 * s, z, s > 0 ? Math.PI / 2 : -Math.PI / 2); window.__pv_prueba.forzarEje(s, 0); window.__pv_prueba.empujar(15 * s, 0); }, [c.sitio.x, c.sitio.z, s]);
    await dormir(2500);
    c = await p.evaluate((g) => window.__pv_prueba[g](), gancho);
    console.log('  pasada', pasada, JSON.stringify(c.estados));
  }
  await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
  for (let i = 0; i < 6; i++) { await dormir(800); c = await p.evaluate((g) => window.__pv_prueba[g](), gancho); if (c.disuelto) break; }
  console.log(gancho, 'tras pasar por medio:', JSON.stringify(c), '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent), '· dinero:', await p.evaluate(() => document.querySelector('#hud-dinero').textContent));
}
await corro('pino-montano', 23, 'botellon', 'logs/captura-botellon.png');
if (!process.argv[2]) await corro('nervion', 21, 'aficion', 'logs/captura-aficion.png');
await b.close(); srv.close();
