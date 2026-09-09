// A/B de frames entre dos dist/: misma medición que verificar.mjs (barrio inicial, dos ventanas de 10 s).
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm' };
async function medir(DIST) {
  const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await p.goto(`http://127.0.0.1:${srv.address().port}/`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
  await p.click('#boton-jugar');
  await new Promise((r) => setTimeout(r, 3000));
  const ventanas = [];
  for (const tecla of ['w', 'd']) {
    const f0 = await p.evaluate(() => window.__pv_frames);
    await p.keyboard.down(tecla);
    await new Promise((r) => setTimeout(r, 10000));
    await p.keyboard.up(tecla);
    ventanas.push((await p.evaluate(() => window.__pv_frames)) - f0);
  }
  await b.close(); srv.close();
  return ventanas;
}
const dists = process.argv.slice(2);
for (let ronda = 0; ronda < 2; ronda++) for (const d of dists) console.log(ronda, d, JSON.stringify(await medir(d)), (await import('node:child_process')).execSync('vcgencmd measure_temp', { encoding: 'utf8' }).trim());
