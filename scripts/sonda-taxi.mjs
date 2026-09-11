// Sonda: hay taxis en el tráfico, se roba uno, salen clientes, parar a su lado los sube y
// llegar a la puerta paga; y el 13 robado recoge pasajeros en la marquesina.
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
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=${barrio}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await dormir(1500);
const info0 = await p.evaluate(() => { const i = window.__pv_info(); return { taxis: i.taxis, esperando: i.esperando, paradas: i.paradas }; });
console.log('antes:', JSON.stringify(info0));
const robado = await p.evaluate(() => window.__pv_prueba.robarTaxi());
await dormir(300);
console.log('robar taxi:', robado, 'aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent), JSON.stringify(await p.evaluate(() => window.__pv_prueba.taxi())));
// Espera a que salga un cliente.
let taxi = null;
for (let i = 0; i < 20 && !(taxi && taxi.clientes.length); i++) { await dormir(500); taxi = await p.evaluate(() => window.__pv_prueba.taxi()); }
console.log('clientes:', JSON.stringify(taxi));
if (taxi && taxi.clientes.length) {
  const [cx, cz] = taxi.clientes[0];
  await p.evaluate(([x, z]) => window.__pv_prueba.irCoche(x + 2, z), [cx, cz]);
  await dormir(1200);
  taxi = await p.evaluate(() => window.__pv_prueba.taxi());
  console.log('parado al lado:', JSON.stringify(taxi), 'aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent), 'hud:', await p.evaluate(() => document.querySelector('#hud-carrera').textContent));
  if (taxi.destino) {
    const dinero0 = await p.evaluate(() => document.querySelector('#hud-dinero').textContent);
    await p.evaluate(([x, z]) => window.__pv_prueba.irCoche(x + 1, z + 1), [taxi.destino.x, taxi.destino.z]);
    await dormir(1200);
    taxi = await p.evaluate(() => window.__pv_prueba.taxi());
    console.log('en destino:', JSON.stringify(taxi), 'dinero', dinero0, '→', await p.evaluate(() => document.querySelector('#hud-dinero').textContent), 'aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
  }
}
await p.screenshot({ path: 'logs/captura-taxi.png' });
// El 13: robarlo y ponerlo en una parada con gente esperando.
const bus = await p.evaluate(() => window.__pv_prueba.robarBus());
const paradas = await p.evaluate(() => window.__pv_escena && window.__pv_info().paradas);
console.log('robar el 13:', bus, 'paradas:', paradas);
const dineroAntes = await p.evaluate(() => document.querySelector('#hud-dinero').textContent);
// Sin gancho de lista: probamos con la parada de llegada (el arranque está al lado).
await p.evaluate(() => { const a = window.__pv_prueba.paradaLlegada(); window.__pv_prueba.irCoche(a.x, a.z + 3); });
await dormir(3000);
const info1 = await p.evaluate(() => { const i = window.__pv_info(); return { esperando: i.esperando, enCoche: i.enCoche }; });
console.log('en la parada:', JSON.stringify(info1), 'dinero', dineroAntes, '→', await p.evaluate(() => document.querySelector('#hud-dinero').textContent), 'aviso:', await p.evaluate(() => document.querySelector('#aviso').textContent));
await p.screenshot({ path: 'logs/captura-bus-parada.png' });
console.log(errores.length ? `ERRORES: ${errores.slice(0, 3).join('\n')}` : 'sin errores');
await b.close(); srv.close();
process.exit(errores.length ? 1 : 0);
