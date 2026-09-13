// Sonda: el stoppie (a fondo recto y frenazo) y las bolsas de basura junto a los contenedores.
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
await dormir(500);
// Bolsas: hay junto a los contenedores.
const bolsas = await p.evaluate(() => window.__pv_prueba.trastos('bolsa'));
const contenedores = await p.evaluate(() => window.__pv_prueba.trastos('contenedor'));
console.log('bolsas:', bolsas.length, '· contenedores:', contenedores.length);
// Stoppie: en la avenida (la parada de arranque está en calle rodada), a fondo al norte y frenazo.
const parada = await p.evaluate(() => window.__pv_prueba.paradaLlegada());
await p.evaluate(([x, z]) => window.__pv_prueba.irA(x, z, 0), [parada.x, parada.z]);
await dormir(300);
await p.evaluate(() => { window.__pv_prueba.forzarEje(0, 1); window.__pv_prueba.empujar(0, -14); });
await dormir(1500);
await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
await p.keyboard.down('Space');
let maximo = 0;
for (let i = 0; i < 12; i++) { await dormir(150); const e = await p.evaluate(() => window.__pv_prueba.estilo()); maximo = Math.max(maximo, e.stoppie); if (i % 3 === 0) console.log('  ', JSON.stringify(e)); }
await p.keyboard.up('Space');
await dormir(1500);
const stats = await p.evaluate(() => window.__pv_prueba.stats());
console.log('stoppie en curso máx:', maximo.toFixed(2), '· stoppies:', stats.stoppies, '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
// Una bolsa por los aires.
if (bolsas.length) {
  const [bx, bz] = bolsas[0];
  await p.evaluate(([x, z]) => { window.__pv_prueba.irA(x - 8, z, Math.PI / 2); window.__pv_prueba.forzarEje(1, 0); window.__pv_prueba.empujar(12, 0); }, [bx, bz]);
  let s2 = stats;
  for (let i = 0; i < 12 && !s2.bolsas; i++) { await dormir(400); s2 = await p.evaluate(() => window.__pv_prueba.stats()); }
  await p.evaluate(() => window.__pv_prueba.forzarEje(0, 0));
  await p.screenshot({ path: 'logs/captura-bolsas.png' });
  console.log('bolsas reventadas:', s2.bolsas, '· aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
}
await b.close(); srv.close();
