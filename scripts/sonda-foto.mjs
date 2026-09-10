// Sonda: captura de un punto concreto de un barrio a una hora dada.
// Uso: node scripts/sonda-foto.mjs <barrio> <x> <z> [hora] → logs/captura-foto-<barrio>.png
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const DIST = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { let r = new URL(req.url, 'http://x').pathname; if (r.endsWith('/')) r += 'index.html'; try { res.writeHead(200, { 'content-type': MIME[extname(r)] ?? 'application/octet-stream' }); res.end(await readFile(join(DIST, r))); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const [barrio = 'pino-montano', x = '0', z = '0', hora = '12'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await p.goto(`http://127.0.0.1:${srv.address().port}/?barrio=${barrio}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__pv_listo === true, null, { timeout: 120000 });
await p.click('#boton-jugar');
await p.evaluate(([h, px, pz]) => { window.__pv_prueba.hora(h); window.__pv_prueba.irA(px, pz, 0); }, [+hora, +x, +z]);
await new Promise((r) => setTimeout(r, 2500));
await p.screenshot({ path: `logs/captura-foto-${barrio}.png` });
console.log(JSON.stringify(await p.evaluate(() => ({ render: window.__pv_info().render, vehiculo: window.__pv_info().vehiculo }))));
await b.close(); srv.close();
