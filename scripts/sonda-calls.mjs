// Sonda de rendimiento: draw calls y triángulos por barrio (día y noche, parado y en marcha),
// desglose de triángulos por grupo, y la foto.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}/`;
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
const calidad = process.argv[2] ?? 'alta';
for (const barrio of ['pino-montano', 'alameda', 'triana']) {
  await p.goto(`${base}?barrio=${barrio}&calidad=${calidad}`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
  await p.click('#boton-jugar');
  const medir = async (etiqueta) => {
    await new Promise((r) => setTimeout(r, 1200));
    const i = await p.evaluate(() => { const i = window.__pv_info(); return { calls: i.render.calls, tris: i.render.triangles, trastos: i.trastos, calidad: i.calidad }; });
    console.log(`${barrio} ${etiqueta}: ${JSON.stringify(i)}`);
  };
  await p.evaluate(() => window.__pv_prueba.hora(12));
  await medir('día parado');
  await p.keyboard.down('w'); await new Promise((r) => setTimeout(r, 3000)); await medir('día en marcha'); await p.keyboard.up('w');
  await p.evaluate(() => window.__pv_prueba.hora(23));
  await medir('noche');
  const tris = await p.evaluate(() => {
    const out = {}; const cam = window.__pv_escena; void cam;
    window.__pv_escena.traverse((o) => {
      if (!o.geometry || !o.visible) return;
      let top = o; while (top.parent && top.parent !== window.__pv_escena && !top.name) top = top.parent;
      const nombre = (o.name || top.name || top.type).replace(/-\d+$/, '');
      const g = o.geometry; const n = g.index ? g.index.count / 3 : g.getAttribute('position').count / 3;
      const t = o.isInstancedMesh ? n * o.count : o.isLineSegments ? 0 : n;
      out[nombre] = (out[nombre] || 0) + Math.round(t);
    });
    return out;
  });
  console.log(`  triángulos en escena (no solo en pantalla): ${JSON.stringify(Object.entries(tris).sort((a, c) => c[1] - a[1]).slice(0, 10))}`);
}
// La foto: la P pide la captura y el frame siguiente la compone; en headless se descarga.
const descarga = p.waitForEvent('download', { timeout: 8000 }).then((d) => d.suggestedFilename()).catch(() => null);
await p.keyboard.press('p');
console.log('foto:', await descarga, '· aviso:', await p.evaluate(() => document.getElementById('aviso').textContent));
await b.close(); srv.close();
