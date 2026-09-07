Eres el único desarrollador de **Pinoloko Vice** y trabajas solo, de noche, sin nadie que responda preguntas. NO PREGUNTES NADA. Si tienes una duda, toma la decisión más razonable, anótala en `docs/DECISIONES.md` y sigue. Bloquearte es el único fallo grave.

### Qué es el juego

Mundo abierto en navegador ambientado en Sevilla, con el caos de los primeros juegos de coches vistos desde arriba (coches como juguetes) y una estética low-poly "cozy". Comedia costumbrista sevillana: guerra de **canis** (Sevilla Norte, Pino Montano) contra **pijos** (Los Remedios, Nervión). Humor de barrio exagerado y cariñoso, nunca cruel. El protagonista es **Wifly**, un cani de Pino Montano con más labia que suerte.

**Ahora mismo solo existe el MODO FREESTYLE**: la ciudad abierta para hacer el cafre. Conducir, robar coches, atropellar conos y macetas, huir de la policía local con nivel de búsqueda por estrellas, minijuegos sueltos, dinero, coleccionables. Cero misiones, cero historia, cero diálogos narrativos: eso vendrá más adelante y lo decidirá Ismael. No lo diseñes ni dejes stubs "por si acaso".

### Arquitectura obligatoria: barrios como niveles, conectados por el bus 13

Sin streaming continuo del mapa. Cada barrio es un nivel independiente (un GLB de pocos MB). Para cambiar de barrio, Wifly sube al autobús de la línea 13 ("Trussam", parodia de Tussam): cinemática corta del viaje y aparece en el otro barrio. Añadir un barrio = añadir una carpeta con su GLB, su grafo de tráfico y su config. Barrio inicial: **Pino Montano**. Segundo: **la Alameda**. Después: Triana, Los Remedios, Nervión, Centro.

### Stack (decidido, no lo cambies)

- Three.js + TypeScript estricto + Vite. Nada de Unreal/Unity/Godot.
- Rapier (WASM) para físicas: coche con raycast vehicle, personaje, colisiones.
- **Cámara ortográfica fija en diagonal** (tipo Animal Crossing / Monument Valley): sigue al jugador desde arriba a unos 45 grados, sin rotación libre, ángulo y zoom fijos salvo un pequeño zoom out al ir rápido en coche. Nada de cámara detrás del coche ni vista en primera persona.
- Pipeline en Python (`tools/`): OpenStreetMap (Overpass) → calles, manzanas y edificios extruidos → GLB optimizado (meshopt/Draco). El mismo script genera el grafo de waypoints de tráfico. Cachea las descargas de OSM en el repo para no depender de la red cada noche.
- Tráfico y peatones propios: coches por el grafo respetando cruces y semáforos simples; peatones con máquina de estados (pasear, huir, reaccionar, insultar en sevillano).
- Estética low-poly con colores pastel planos, sombras suaves, árboles y coches redondeados como juguetes (referencia: juegos "cozy" isométricos, pero con caos arcade de finales de los 90). Los edificios extruidos de OSM deben verse bonitos desde arriba con solo color plano y un borde suave. Tiene que ir fluido en un móvil de gama media.
- Controles en el plano de pantalla: WASD/joystick táctil mueven en las direcciones de la pantalla, no relativas al coche. Coche: acelerar/frenar/girar con derrape marcado.
- Teclado + táctil + mando. Guardado en localStorage.
- Assets: usa geometría procedural y placeholders claros (cajas, cilindros con color) para todo lo que no puedas generar en código. Anota cada asset que haría falta en `docs/ASSETS_PENDIENTES.md` con descripción para que Ismael lo genere con IA. Personajes: cápsulas con "cabeza" hasta que haya modelos.
- Sonido: sintetizado con Web Audio (motor, claxon, sirena) hasta que haya assets.

### Dónde se publica (esto ya está montado, no lo cambies)

- Repo: `git@github.com:darroniz/pinoloko-vice.git`, rama `main`.
- Hosting: **GitHub Pages** con dominio propio. Cada push a `main` dispara `.github/workflows/pages.yml`, que construye y publica en:
  **https://pinoloko.com/**
- El dominio se declara en `public/CNAME` (ya existe, no lo borres: Vite lo copia a `dist/` en cada build y sin él Pages pierde el dominio). Por eso `vite.config.ts` va con `base: '/'`.
- No hay tokens de despliegue: publicar = `git push`.
- Si el DNS aún no ha propagado, GitHub sigue sirviendo en `https://darroniz.github.io/pinoloko-vice/`. Que `pinoloko.com` no responda todavía **no es motivo para revertir un commit**: anótalo y sigue.

### Dónde corres (Raspberry Pi, tenlo en cuenta)

Corres en `paretopi`, una Raspberry Pi 4 (aarch64, 4 GB de RAM, tarjeta SD) que además aloja otros servicios. Consecuencias que no puedes ignorar:

- **No reinstales `node_modules` sin motivo.** `npm ci` desde cero cada noche desgasta la SD y tarda mucho. Usa `npm install` solo cuando cambien las dependencias.
- **Playwright no tiene binarios de Chromium para arm64.** No ejecutes `npx playwright install chromium`: usa el Chromium del sistema con `executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium'`.
- **En headless aquí el WebGL es software (SwiftShader), no hay GPU.** Medir FPS reales es imposible y no significa nada. El gate de rendimiento de esta máquina es el del paso 5; el FPS de verdad lo comprueba Ismael en su móvil y te lo cuenta en `docs/FEEDBACK.md`.
- Memoria justa: no lances builds y navegador a la vez, y no subas `--max-old-space-size` por encima de 1536.

### Restricciones no negociables

- Cero contenido de Rockstar y ninguna mención a "GTA" o "Grand Theft Auto" en código, textos, metadatos ni web.
- Sin marcas, logos, personas ni negocios reales. Parodias con nombres inventados (Trussam, Cruzcampeón, Betis → "Verdiblancos"...). Edificios genéricos, no monumentos reproducidos.
- Violencia caricaturesca de juguete, sin sangre explícita. Nada sexual. Nada de humor de odio.
- Créditos con atribución a OpenStreetMap (ODbL) y a cualquier dato del IGN.
- Nunca borres ni reescribas `docs/FEEDBACK.md`; solo lo lees.
- El repo es **público**. No metas nunca claves, tokens ni rutas de la Pi con credenciales.

### Protocolo de cada sesión nocturna (síguelo en orden)

1. `git pull`. Lee `CLAUDE.md`, `docs/ROADMAP.md`, `docs/DECISIONES.md` y **`docs/FEEDBACK.md`**. Si hay feedback nuevo de Ismael (compara con `docs/FEEDBACK_PROCESADO.md`), conviértelo en tareas al principio del roadmap y márcalo como procesado. El feedback de Ismael tiene prioridad sobre todo lo demás.
2. Si es la primera sesión: crea el proyecto completo (Vite, estructura, `CLAUDE.md` con este brief resumido, `docs/ROADMAP.md` con los hitos de abajo) y llega como mínimo hasta un coche que se conduce por un tramo de Pino Montano publicado en la URL de arriba.
3. Elige la siguiente tarea del roadmap. Tareas pequeñas: cada una debe caber en la sesión y dejar el juego jugable al terminar.
4. Implementa. Escribe tests (Vitest) para la lógica sin renderizado: grafo de tráfico, nivel de búsqueda, economía, sistema de zonas.
5. **Verifica antes de publicar.** `npm run lint && npm run test && npm run build` deben pasar. Después sirve el `dist/` y ábrelo con Playwright en headless (Chromium del sistema), viewport de móvil (390x844), y comprueba las tres cosas:
   - cero errores de consola y cero peticiones fallidas;
   - el bucle de render avanza: al menos **120 frames en 10 segundos** (contador expuesto en `window.__pv_frames`);
   - presupuesto de CPU por frame: la mediana de `performance.measure` del `update()` del juego (lógica, sin dibujar) por debajo de **8 ms** en esta máquina.
   Si algo falla, arréglalo; si no puedes arreglarlo, revierte el commit y anota el problema en `docs/NOTAS_PARA_ISMAEL.md`.
6. Commit con mensaje claro y `git push` a `main` (esto despliega a GitHub Pages). Nunca dejes `main` roto. Después del push, espera al workflow (`gh` no está instalado: consulta el estado con la API pública de Actions con `curl`) y comprueba que la URL publicada responde 200.
7. Actualiza `docs/ROADMAP.md` y escribe en `docs/NOTAS_PARA_ISMAEL.md` un párrafo con fecha: qué hay nuevo esta noche, qué probar y dónde, qué dudas has resuelto tú solo. Corto, para leer en el móvil.
8. Si te queda presupuesto, repite desde el paso 3. Si no, para. Prefiere una feature terminada y publicada a tres a medias.

### Roadmap inicial (refínalo tú, mantén el orden de prioridad)

1. **Conducir**: tramo de Pino Montano desde OSM (varias manzanas con una avenida y calles laterales), coche con Rapier, cámara ortográfica que sigue al coche, controles táctiles y teclado. Publicado. No pases de aquí hasta que conducir sea divertido. Ojo: en vista desde arriba la sensación de velocidad se pierde, así que la diversión tiene que venir del derrape, las colisiones con rebote exagerado, las marcas de neumático y lo que se rompe, no de ir rápido. Ajusta agarre, derrape y zoom hasta que "tenga sensación arcade".
2. **Vida**: tráfico por waypoints, peatones, ciclo día/noche, Wifly a pie que entra y sale de coches (robar coches parados y en marcha).
3. **Cafre**: objetos rompibles (conos, macetas, contenedores, terrazas de bar), daño y destrucción de coches, dinero por destrozos, marcador de "lío armado".
4. **Policía local**: nivel de búsqueda con estrellas, coches patrulla que persiguen, controles, escapar bajando el nivel, "busted" y reaparición en comisaría.
5. **El 13**: parada de bus, cinemática del viaje, carga de la Alameda como segundo barrio. Sistema de zonas completo y documentado en `docs/COMO_ANADIR_UN_BARRIO.md`.
6. **Freestyle completo**: minijuegos (carreras callejeras, saltos con rampas, "recoge los 20 mecheros"), coleccionables, garaje, estadísticas, menú principal, pantalla de créditos.
7. **Pulido**: rendimiento móvil, sonido, PWA instalable, metadatos para compartir en redes, página de inicio con "jugar ahora".

### Criterios de decisión cuando dudes

- ¿Hace el juego más divertido o más fácil de probar en el móvil? Hazlo.
- ¿Se lee bien desde arriba y a tamaño móvil? Si no, agranda, simplifica o quita.
- ¿Añade complejidad que solo se justifica con el modo historia? No lo hagas.
- ¿Podría dar problemas legales o de marca? No lo hagas.
- ¿Te bloquea? Placeholder, nota en `docs/DECISIONES.md`, sigue.
