import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Service worker sin dependencias: al terminar el build recorre dist/, hace la lista de
 * ficheros y escribe dist/sw.js con esa lista y un nombre de caché derivado de su hash.
 * Cada build nuevo = caché nueva; las viejas se borran al activarse.
 */
function serviceWorker(): Plugin {
  let salida = 'dist';
  return {
    name: 'pinoloko-sw',
    apply: 'build',
    configResolved(c) { salida = c.build.outDir; },
    closeBundle() {
      const ficheros: string[] = [];
      const recorrer = (dir: string): void => {
        for (const f of readdirSync(dir)) {
          const ruta = join(dir, f);
          if (statSync(ruta).isDirectory()) recorrer(ruta);
          else ficheros.push('/' + relative(salida, ruta).split('\\').join('/'));
        }
      };
      recorrer(salida);
      const lista = ficheros.filter((f) => !['/sw.js', '/CNAME', '/marca/logo-original.png'].includes(f)).sort();
      const hash = createHash('sha1');
      for (const f of lista) hash.update(f).update(readFileSync(join(salida, f)));
      const version = hash.digest('hex').slice(0, 10);
      const sw = `// Generado en el build: no editar. Versión ${version}.
const CACHE = 'pinoloko-${version}';
const FICHEROS = ${JSON.stringify(lista)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHEROS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const esPagina = req.mode === 'navigate';
  // La página va por la red primero (para coger builds nuevas) y a caché si no hay conexión;
  // los assets con hash, caché primero.
  e.respondWith(esPagina
    ? fetch(req).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put('/index.html', copia)); return r; }).catch(() => caches.match('/index.html'))
    : caches.match(req).then((r) => r || fetch(req)));
});
`;
      writeFileSync(join(salida, 'sw.js'), sw);
      console.log(`sw.js: ${lista.length} ficheros en caché ${CACHE_NOMBRE(version)}`);
    },
  };
}
const CACHE_NOMBRE = (v: string): string => `pinoloko-${v}`;

export default defineConfig({
  base: '/',
  plugins: [serviceWorker()],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          rapier: ['@dimforge/rapier3d-compat'],
        },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
