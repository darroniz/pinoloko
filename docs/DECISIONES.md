# Decisiones tomadas sin preguntar

Cada vez que una sesión nocturna se encuentre una duda, decide lo más razonable, lo apunta
aquí con fecha y sigue. Si Ismael no dice nada, la decisión queda firme.

---

## 2026-09-07 — Decisiones del montaje (antes de la primera sesión)

**Hosting: GitHub Pages en vez de Vercel.** El prompt original pedía Vercel con `VERCEL_TOKEN`.
No hay cuenta de Vercel ni dominio, y sí hay GitHub. Cada push a `main` dispara el workflow
`pages.yml`, que construye y publica. Ventaja: no hay ningún token de despliegue que custodiar
en la Pi; publicar es literalmente `git push`. URL: https://pinoloko.com/

**Repo público.** GitHub Pages solo publica desde repos privados con plan de pago. El juego va
a ser público igualmente, así que el repo es público. Consecuencia: aquí no entra ninguna clave.

**Dominio propio `pinoloko.com`.** Ismael lo compró el mismo día del montaje, así que el sitio
nace ya con dominio: `public/CNAME` contiene `pinoloko.com` y `vite.config.ts` va con `base: '/'`.
El fichero `CNAME` tiene que llegar a `dist/` en cada build (por eso vive en `public/`): si un
build lo pierde, GitHub Pages se olvida del dominio. Mientras el DNS propaga, Pages sigue
sirviendo en `darroniz.github.io/pinoloko/`, y eso no debe hacer fallar la verificación.

**Máquina: `paretopi` (Raspberry Pi 4) y no un VPS aislado.** El prompt pedía máquina aislada
porque la sesión corre con `--dangerously-skip-permissions`. Se ha optado por reutilizar la Pi
que ya existe, como usuario `idarroniz`, asumiendo ese riesgo a cambio de no montar ni pagar un
VPS. Mitigación aplicada: la sesión arranca con `--strict-mcp-config` y sin ningún MCP, y su
directorio de trabajo es solo el repo.

**Node 22 vía NodeSource.** El `nodejs` de Debian Bookworm es el 18 y se queda corto para el
tooling actual de Vite/Vitest.

**Playwright usa el Chromium del sistema.** Playwright no publica binarios de Chromium para
linux-arm64, así que `npx playwright install chromium` no sirve en la Pi. Se usa
`executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium'`.

**El gate de "30 FPS" se sustituye.** En headless sobre la Pi no hay GPU: el WebGL va por
SwiftShader (software) y nunca llegaría a 30 FPS, así que ese gate revertiría todos los commits.
En su lugar el paso 5 comprueba: cero errores de consola, ≥120 frames renderizados en 10 s, y
mediana del `update()` de lógica por debajo de 8 ms. El rendimiento real en móvil lo valida
Ismael y lo cuenta en `FEEDBACK.md`.

**Lanzador: timer de systemd, no cron.** Permite limitar memoria y prioridad de CPU/disco para
no molestar a los otros servicios de la Pi, y deja los logs en el journal además del fichero.

**El dominio se ata en los ajustes del repo, no en el fichero `CNAME`.** Con despliegue por
workflow (`build_type: workflow`), GitHub Pages **ignora** el `CNAME` del artefacto: el dominio
vive en la configuración del repo (`PUT /repos/:owner/:repo/pages`, campo `cname`), ya fijado a
`pinoloko.com`. Se mantiene `public/CNAME` de todas formas como red de seguridad y como pista
para quien lea el repo. Si algún día el dominio "se cae" del sitio, el sitio a mirar es Settings
→ Pages, no el fichero.

## 2026-09-07 — Cámara: perspectiva alta en vez de ortográfica

El brief original pedía cámara **ortográfica** a 45°. Se cambia a **perspectiva** con FOV
estrecho y ángulo alto fijo (55-60°), sin rotación. Decidido con Ismael el mismo día del
montaje, antes de la primera sesión.

Motivo: el propio brief ya señalaba que desde arriba se pierde la sensación de velocidad y
pedía compensarlo con derrape y colisiones. La perspectiva devuelve parte de esa sensación
por paralaje, sin coste de producción y sin tocar el diseño.

Se descartó el 3D a ras de calle (tipo GTA III) por el arte, no por el motor: los edificios
son extrusiones de huellas de OpenStreetMap con color plano y desde abajo son cajas grises.
Bajar la cámara obligaría a fachadas, LODs, oclusión y niebla de distancia — justo el trabajo
que la arquitectura de barrios-como-niveles evita a propósito. Referencia asumida: GTA
Chinatown Wars (2009), posterior a GTA IV, que teniendo motor 3D completo eligió cámara alta
para pantalla pequeña. Se toma de ahí la **altura de cámara**, no la densidad de arte.

La cámara baja queda reservada a la cinemática del 13 y a repeticiones cortas.

## 2026-09-07 — El juego se llama Pinoloko, la scooter manda y se arranca por el Mercado

**Nombre: `Pinoloko`, sin "Vice".** Decisión de Ismael. Repo renombrado a `darroniz/pinoloko`
(GitHub mantiene la redirección del nombre viejo). El dominio ya era `pinoloko.com`.

**Zona de arranque acotada al entorno del Mercado de Pino Montano**, caja de 500 x 500 m
`37.42020,-5.96658,37.42470,-5.96092`, en vez de "un tramo de Pino Montano" sin definir.
Elegida por Ismael porque es donde está la vida del barrio. Comprobado en OSM: 184 edificios,
107 con `building:levels`.

**La scooter sustituye al coche como vehículo protagonista.** El argumento de Ismael es que
Pino Montano se cruza andando y no hay grandes vías, así que una persecución de coches no pega;
lo que hay es paso a pie entre bloques. Los datos de OSM de la caja lo confirman: 52 vías
`pedestrian` + 17 `footway` + 12 `cycleway` frente a 30 `residential` + 6 `tertiary`. Dos a uno
a favor de lo peatonal. Los coches siguen existiendo (tráfico, aparcados, patrullas, robables),
pero el juego se afina alrededor de la moto, y de ahí sale la mejor mecánica de persecución:
la patrulla no cabe por los pasajes y tú sí.

**El detalle va en los tejados, no en las fachadas.** Se descartó texturizar fachadas con
imaginería tipo Street View por tres motivos que siguen en pie: la licencia de Google prohíbe
descargar y almacenar esa imaginería fuera de un mapa suyo, el pipeline de proyectar panorámicas
esféricas sobre huellas de edificio (corregir perspectiva, quitar coches y árboles, casar
iluminaciones) es trabajo de investigación, y sobre todo **la cámara alta enseña azoteas, no
fachadas**: montarías todo eso para texturizar la superficie que menos se ve. En su lugar,
detalle procedural de azotea y explotar las etiquetas que OSM ya trae.

## 2026-09-07 — Fuera la autocensura de marcas

Ismael lo pidió explícitamente: el juego es personal, no se monetiza, y el objetivo es que sea
divertido. Los nombres reales van dentro — motos (Jog RR, Zip SP, Sonic), el autobús de Tussam,
los comercios con el `name` que traen las etiquetas de OSM. Cuanto más se reconozca el barrio,
mejor funciona el chiste.

Si algún día el juego sale del ámbito personal, se hace **entonces** una pasada de
despersonalización: es sustituir cadenas de texto y un par de siluetas, una tarde de trabajo.
Bloquear el diseño hoy por un escenario que puede no llegar nunca no compensa.

Lo que **no** se ha tocado, porque no eran remilgos de marca:
- el tono (violencia de juguete, nada sexual, nada de humor de odio);
- la atribución a OpenStreetMap, que es la licencia de los datos del mapa;
- no meter en el repo ficheros (modelos, texturas, audio) sacados de otro juego.

## 2026-09-07 — Fable 5.1 y noches de 6 horas con plan por delante

La sesión nocturna corre con **Fable 5.1** (`claude-fable-5-1`), fijado en la unidad de systemd
(`PINOLOKO_MODEL`), no en el script: se cambia editando la unidad y recargando, sin tocar el repo.

La ventana de trabajo es de **unas 4 horas y media** (00:15 a 04:45, con corte duro a las 05:05)
y `--max-turns` sube a 1500, de forma que el límite real sea el reloj y no los turnos.
El paso 2 del protocolo obliga a escribir el plan de la noche antes de tocar código, en bloques de
45-60 minutos con commit publicable cada uno. El motivo es que el riesgo de una sesión larga y sin
supervisión no es pasarse, es apuntar bajo: terminar la primera tarea pronto y gastar el resto de
la noche puliendo lo que ya funcionaba.

## 2026-09-07 — La noche cabe en una sola ventana de cuota

Se pidieron 6 horas de trabajo por noche. No caben, y el motivo no es técnico sino de cuota: el
plan mide el consumo en **ventanas rodantes de 5 horas** que arrancan con la primera petición, no
a una hora fija. Una sesión de 6 h arrancando a las 00:30 agota la ventana 00:30-05:30 y **abre
una segunda** de 05:30 a 10:30, que se solapa con la mañana de trabajo de Ismael y se la deja
mordida.

Así que la noche se ajusta a **00:15 → 04:45** (corte duro 05:05), dentro de una sola ventana.
A las 09:00 esa ventana ya expiró y la mañana arranca limpia. Se pierde hora y media de trabajo
autónomo a cambio de no tocar la cuota con la que Ismael trabaja: el cambio vale la pena porque
su trabajo va primero.

Además, `noche.sh` no arranca si el consumo **semanal** cacheado supera el 70%
(`PINOLOKO_TOPE_SEMANAL`). El límite de 7 días es el que de verdad duele: se acumula noche a
noche y solo se reinicia una vez por semana. Es un freno grueso, porque la cifra que lee es la de
la última lectura de la CLI y no la de ese instante, pero basta para que el juego no se coma la
semana.

## 2026-09-07 — Cifras reales de cuota (medidas, no supuestas)

Leído con `/usage` en el portátil de Ismael:

- **Sesión:** ventana rodante de 5 h. Marcaba reset a las 17:30 con la ventana abierta desde las
  12:30 — hora rota, que confirma que rueda con la primera petición y no va a hora fija.
- **Semana (todos los modelos):** reinicia los **martes a las 12:00 (Europe/Madrid)**.
- **Semana (por modelo):** existe un cupo semanal **separado** para el modelo con el que se
  trabaja, con el mismo reset. Este es el que importa aquí: como todas las noches van con el
  mismo modelo, sube mucho más rápido que el general.

Por eso el freno de `noche.sh` mira **el máximo de todos los cupos semanales**, no solo el
general: mirando únicamente "all models" se pasaría por alto justo el que la sesión nocturna
agota primero.

Nota de calendario: el reset semanal cae en martes a mediodía, así que las noches de domingo y
lunes son las que llegan con el cupo más gastado.

## 2026-09-07 — Más caña al modelo propio, mano dura con el cupo compartido

Ismael trabaja casi siempre en Opus, así que el cupo semanal del modelo de la sesión nocturna
(Fable) es prácticamente suyo para gastar. El freno pasa a tener **dos umbrales** en vez de uno:

- cupo **compartido** ("all models"): tope al **60%**. De ahí también tira Ismael, y su trabajo
  va primero.
- cupo **propio del modelo**: tope al **92%**. Ese no se lo quita a nadie, así que se apura.

`--max-turns` sube de 1500 a 2500 por la misma razón: que el límite de la noche sea el reloj.

Lo que **no** se ha tocado, y conviene saber por qué: la ventana de sesión de 5 h **sí es
compartida** entre modelos, así que el horario 00:15 → 04:45 se queda como está. Y no se adelanta
el arranque: empezar a las 23:00 sería peor, no mejor, porque si Ismael ha estado trabajando esa
tarde su ventana de 5 h sigue abierta y la sesión nocturna se metería dentro, con lo que la
siguiente ventana se abriría de madrugada y alcanzaría su mañana. Arrancar tarde es lo que
garantiza que la Pi estrena ventana.

## 2026-09-08 — Primera sesión: nivel en JSON, scooter arcade sobre una bola, losetas

**El nivel es JSON, no GLB (de momento).** En la Pi no hay `pip` ni `numpy`, así que el pipeline
de `tools/` va en Python de stdlib puro: descarga Overpass cacheada en `tools/cache-osm/` y un
`nivel.json` de ~110 KB con huellas en metros locales, alturas, tipo, color, vías, grafo, POIs y
zonas. La geometría (extrusión, cintas de calle, azoteas) la construye Three.js al cargar, en
menos de medio segundo para 186 edificios. Ventajas: pesa menos que un GLB, y el detalle de
azotea se puede iterar en TypeScript sin regenerar nada. Si algún barrio crece hasta que la
construcción en cliente tarde, se pasa a GLB entonces; el formato intermedio ya está.

**Sin árboles en OSM: se plantan solos.** La caja no trae ni un `natural=tree`, así que los
árboles se reparten procedimentalmente por los pasajes (cada 11 m, a un lado) y por los jardines,
evitando edificios y asfalto, con semilla fija para que el barrio sea siempre el mismo.

**La scooter es arcade, no un raycast vehicle.** Físicamente es una bola de Rapier con rotaciones
bloqueadas y fricción cero; el rumbo, el agarre lateral, el frenado y el derrape se calculan a
mano cada paso y se escriben como velocidad. Un raycast vehicle de dos ruedas sobre suelo plano
no aporta nada y quita control sobre la sensación. La inclinación en curva y el cruce del trasero
son visuales, sobre la malla. Un detalle que costó media hora: con fricción "media" entre bola y
suelo la deceleración por rozamiento era de 11 m/s² y anulaba exactamente el motor.

**Losetas de 64 m con recorte de frustum.** Con todo el barrio en una malla y las instancias sin
recorte, cada frame dibujaba 204.000 triángulos aunque en pantalla cupiese un 5%. Partido en
losetas (una malla por loseta, un InstancedMesh por loseta y tipo de trasto) baja a ~11.000.
En SwiftShader pasa de 1 fps a 10-13; en un móvil real es la diferencia entre ir fluido o no.

**Calidad automática.** Si el renderizador es por software (SwiftShader, llvmpipe) o se pide
`?calidad=baja`, se apagan las sombras, el antialias y se dibuja a DPR 1. Es lo que permite que
la verificación en la Pi tenga sentido, y de paso sirve para móviles flojos.

**La moto se dibuja a escala 1,6.** Desde 66 m de altura una scooter real de 1,7 m es un píxel
en el móvil. Los edificios van a escala real; la moto, de juguete. La física sigue a 1:1.

**Arranque en la calle rodada más cercana al Mercado**, mirando a lo largo de ella, en vez de en
el origen de coordenadas (que cae encima de la azotea del Mercado).

## 2026-09-08 — Trastos con activación por radio y el gate de frames en régimen estable

**Los trastos (conos, macetas, contenedores, terrazas, cajas) solo tienen cuerpo físico cerca de
la moto.** Hay 500 repartidos por el barrio; con todos como cuerpos de Rapier, aunque dormidos,
el paso de física costaba 6 ms en la Pi y despiertos 119 ms. Ahora la pose vive en la malla y el
cuerpo se crea al entrar en un radio de 45 m y se destruye (si está dormido) al salir de 60 m.
Es también la base para tráfico y peatones: nada que esté lejos se simula.

**Cada trasto es una sola malla con colores por vértice.** Como grupo de 3-7 mallas eran ~3.000
objetos que Three recorría cada frame; fundidos, 500.

**El gate de frames mide régimen estable y se queda con la mejor de dos ventanas.** Dos pasadas
idénticas daban 61 y 131 frames: la Pi comparte CPU con Immich y otros servicios, y la sesión
corre con `nice 10`, así que cualquier tarea ajena se le cuela por delante. La verificación ahora
espera 3 s (SwiftShader compila los shaders en los primeros frames) y mide dos ventanas de 10 s.
Sigue siendo un gate de regresión, no una medida de rendimiento: la cifra que importa es la del
móvil de Ismael.

**En calidad baja se sacrifica lo que solo se nota de cerca:** DPR 0,5, sin sombras, sin
antialias, sin líneas de borde en los edificios y sin la capa de acera de las calles rodadas.
Los móviles con GPU van en calidad alta con todo.
