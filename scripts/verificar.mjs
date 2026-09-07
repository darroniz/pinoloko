// Verificación del paso 6 del protocolo: sirve dist/, abre con Chromium del sistema en
// viewport de móvil y comprueba consola limpia, frames avanzando y coste del update().
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };

const servidor = createServer(async (req, res) => {
  let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (ruta.endsWith('/')) ruta += 'index.html';
  const fichero = join(DIST, ruta);
  try {
    await stat(fichero);
    res.writeHead(200, { 'content-type': MIME[extname(fichero)] ?? 'application/octet-stream' });
    res.end(await readFile(fichero));
  } catch {
    res.writeHead(404); res.end('no');
  }
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const puerto = servidor.address().port;
const url = `http://127.0.0.1:${puerto}/`;

const errores = [];
const fallidas = [];
const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const pagina = await navegador.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
pagina.on('pageerror', (e) => errores.push(String(e)));
pagina.on('requestfailed', (r) => fallidas.push(r.url()));
pagina.on('response', (r) => { if (r.status() >= 400) fallidas.push(`${r.status()} ${r.url()}`); });

let ok = true;
try {
  await pagina.goto(url, { waitUntil: 'load', timeout: 60000 });
  await pagina.waitForFunction(() => window.__pv_listo === true, null, { timeout: 90000 });
  await pagina.click('#boton-jugar');
  await pagina.waitForFunction(() => window.__pv_jugando === true, null, { timeout: 30000 });
  // Calentamiento: SwiftShader compila los shaders en los primeros frames y eso no es régimen estable.
  await new Promise((r) => setTimeout(r, 3000));
  await pagina.evaluate(() => performance.clearMeasures('update'));
  // Dos ventanas de 10 s y se queda con la mejor: la Pi comparte CPU con otros servicios y
  // el ruido entre pasadas idénticas llega al doble. Mueve la scooter para que el update trabaje.
  const ventanas = [];
  for (const tecla of ['w', 'd']) {
    const f0 = await pagina.evaluate(() => window.__pv_frames);
    await pagina.keyboard.down(tecla);
    await new Promise((r) => setTimeout(r, 10000));
    await pagina.keyboard.up(tecla);
    const f1 = await pagina.evaluate(() => window.__pv_frames);
    ventanas.push(f1 - f0);
  }
  const frames = Math.max(...ventanas);
  console.log(`ventanas: ${ventanas.join(' / ')}`);
  const medianaUpdate = await pagina.evaluate(() => {
    const m = performance.getEntriesByName('update').map((e) => e.duration).sort((a, b) => a - b);
    return m.length ? m[Math.floor(m.length / 2)] : -1;
  });
  console.log(`frames en 10 s: ${frames} (mínimo 120)`);
  console.log(`mediana update(): ${medianaUpdate.toFixed(2)} ms (máximo 8)`);
  if (frames < 120) { ok = false; console.log('FALLO: pocos frames'); }
  if (medianaUpdate < 0 || medianaUpdate > 8) { ok = false; console.log('FALLO: update lento'); }
  await pagina.screenshot({ path: 'logs/captura.png' });
} catch (e) {
  ok = false; console.log('FALLO:', e.message);
}
if (errores.length) { ok = false; console.log('Errores de consola:', errores); }
if (fallidas.length) { ok = false; console.log('Peticiones fallidas:', fallidas); }
await navegador.close();
servidor.close();
console.log(ok ? 'VERIFICACIÓN OK' : 'VERIFICACIÓN FALLIDA');
process.exit(ok ? 0 : 1);
