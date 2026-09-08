import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = '/home/idarroniz/pinoloko/dist';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${srv.address().port}/` + (process.argv[2] ?? '');
const args = (process.argv[3] ?? '--use-gl=angle,--use-angle=swiftshader,--enable-unsafe-swiftshader,--ignore-gpu-blocklist').split(',');
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', ...args] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
await p.goto(url, { waitUntil: 'load' });
const t0 = Date.now();
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
console.log('carga ms', Date.now() - t0);
console.log(await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const i = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(i.UNMASKED_RENDERER_WEBGL); }));
console.log(JSON.stringify(await p.evaluate(() => window.__pv_info())));
await p.click('#boton-jugar');
const f0 = await p.evaluate(() => window.__pv_frames);
await p.keyboard.down('w');
await new Promise((r) => setTimeout(r, 2500));
console.log('a mitad', JSON.stringify(await p.evaluate(() => { const i = window.__pv_info(); return { scooter: i.scooter, eje: i.eje }; })));
await p.keyboard.down('d');
await new Promise((r) => setTimeout(r, 2500));
await p.keyboard.up('w'); await p.keyboard.up('d');
// Frenar, bajarse, andar, volver a subirse.
await p.keyboard.down('Space');
await new Promise((r) => setTimeout(r, 2000));
await p.keyboard.up('Space');
await p.keyboard.press('e');
await new Promise((r) => setTimeout(r, 800));
console.log('tras E', JSON.stringify(await p.evaluate(() => { const i = window.__pv_info(); return { aPie: i.aPie, peaton: i.peaton, scooter: [i.scooter.x, i.scooter.z, i.scooter.velocidad] }; })));
await p.keyboard.down('s');
await new Promise((r) => setTimeout(r, 1500));
await p.keyboard.up('s');
console.log('andando', JSON.stringify(await p.evaluate(() => { const i = window.__pv_info(); return { aPie: i.aPie, peaton: i.peaton }; })));
await p.keyboard.down('w');
await new Promise((r) => setTimeout(r, 1500));
await p.keyboard.up('w');
await new Promise((r) => setTimeout(r, 300));
await p.keyboard.press('e');
await new Promise((r) => setTimeout(r, 500));
console.log('tras 2ª E', JSON.stringify(await p.evaluate(() => { const i = window.__pv_info(); return { aPie: i.aPie, vecinosCerca: i.vecinosCerca }; })));
await p.screenshot({ path: 'logs/captura-pie.png' });
// Colisiones: a fondo hacia el norte y luego al este durante 8 s; nunca debe acabar dentro de un edificio.
for (const tecla of ['w', 'd', 's', 'a']) {
  await p.keyboard.down(tecla);
  for (let i = 0; i < 4; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const info = await p.evaluate(() => { const i = window.__pv_info(); return { dentro: i.dentroEdificio, v: i.vehiculo.map((n) => Math.round(n * 10) / 10) }; });
    if (info.dentro) console.log('DENTRO DE EDIFICIO', tecla, JSON.stringify(info));
  }
  await p.keyboard.up(tecla);
}
console.log('colisiones moto comprobadas', JSON.stringify(await p.evaluate(() => { const i = window.__pv_info(); return { salud: i.salud, reventados: i.reventados, aPie: i.aPie }; })));
console.log('robar coche', await p.evaluate(() => window.__pv_prueba.robarCoche()));
for (const tecla of ['w', 'd', 's', 'a']) {
  await p.keyboard.down(tecla);
  for (let i = 0; i < 4; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const info = await p.evaluate(() => { const i = window.__pv_info(); return { dentro: i.dentroEdificio, v: i.vehiculo.map((n) => Math.round(n * 10) / 10) }; });
    if (info.dentro) console.log('DENTRO DE EDIFICIO (coche)', tecla, JSON.stringify(info));
  }
  await p.keyboard.up(tecla);
}
console.log('colisiones coche comprobadas', JSON.stringify(await p.evaluate(() => { const i = window.__pv_info(); return { salud: i.salud, reventados: i.reventados, aPie: i.aPie }; })));
await p.keyboard.down('w');
await new Promise((r) => setTimeout(r, 2500));
await p.keyboard.down('a');
await new Promise((r) => setTimeout(r, 1500));
await p.keyboard.up('w'); await p.keyboard.up('a');
console.log('en coche', JSON.stringify(await p.evaluate(() => { const i = window.__pv_info(); return { enCoche: i.enCoche, trafico: i.trafico, aPie: i.aPie }; })));
await p.screenshot({ path: 'logs/captura-coche.png' });
// Policía: tres estrellas, huir un poco y luego quedarse quieto hasta que te trinquen.
await p.evaluate(() => window.__pv_prueba.calor(300));
await p.keyboard.down('w');
await new Promise((r) => setTimeout(r, 3000));
await p.keyboard.up('w');
console.log('policia', JSON.stringify(await p.evaluate(() => { const i = window.__pv_info(); return { estrellas: i.estrellas, patrullas: i.patrullas, v: i.vehiculo.map((n) => Math.round(n)) }; })));
let trincado = false;
for (let i = 0; i < 40 && !trincado; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const info = await p.evaluate(() => { const i = window.__pv_info(); return { estrellas: i.estrellas, calor: i.calor, patrullas: i.patrullas, v: i.vehiculo.map((n) => Math.round(n)), trincao: document.getElementById('trincao').classList.contains('visible') }; });
  if (i % 5 === 0) console.log('t+' + i, JSON.stringify(info));
  if (info.trincao) { trincado = true; console.log('TRINCADO en t+' + i, JSON.stringify(info)); await p.screenshot({ path: 'logs/captura-trincao.png' }); }
}
console.log('trincado', trincado);
await p.evaluate(() => window.__pv_prueba.hora(22.5));
await new Promise((r) => setTimeout(r, 1500));
await p.screenshot({ path: 'logs/captura-noche.png' });
await p.evaluate(() => window.__pv_prueba.hora(7.2));
await new Promise((r) => setTimeout(r, 1500));
await p.screenshot({ path: 'logs/captura-amanecer.png' });
const f1 = await p.evaluate(() => window.__pv_frames);
console.log('frames/5s', f1 - f0, 'update mediana', await p.evaluate(() => { const m = performance.getEntriesByName('update').map((e) => e.duration).sort((a, b) => a - b); return m[Math.floor(m.length / 2)]; }), 'render mediana', await p.evaluate(() => { const m = performance.getEntriesByName('render').map((e) => e.duration).sort((a, b) => a - b); return m[Math.floor(m.length / 2)]; }), 'objetos', await p.evaluate(() => { let n = 0; window.__pv_escena?.traverse(() => n++); return n; }));
console.log(JSON.stringify(await p.evaluate(() => window.__pv_info())));
await b.close(); srv.close();
