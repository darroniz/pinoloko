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

## 2026-09-08 — Vecinos sin física, motos aparcadas como cuerpos dormidos

**Los vecinos no tienen cuerpo de Rapier.** Son posiciones que recorren el grafo peatonal con
una máquina de estados (pasear, huir, caído, levantarse) y se dibujan como instancias (una
cápsula por color de ropa más una esfera de cabeza). El atropello se detecta por distancia y
velocidad de la moto, no por colisión física: es más barato, más predecible y más de dibujos
animados. 110 vecinos cuestan menos de 0,5 ms por frame. Los insultos son avisos en el HUD.

**Las motos aparcadas son instancias completas de `Scooter` con el cuerpo dormido.** Se despiertan
al empujarlas o al subirse. Catorce repartidas junto a bares, mercado, farmacias y colegios,
con cinco modelos de nombre real y ajustes distintos (la Runner corre más, la Zip gira mejor).
Subirse elige la más cercana a 3,2 m; bajarse exige ir a menos de 9 km/h.

**A pie Wifly es otra bola.** Radio 0,4 m, sin fricción, con amortiguación alta: se para en seco
al soltar el stick. El botón de freno hace de "correr". Cabe por cualquier pasaje.

## 2026-09-08 — Tráfico cinemático y coches que cambian de dueño

**Los coches del tráfico son cuerpos cinemáticos.** Siguen el grafo rodado por su derecha
(carril a 1,7 m del eje), frenan al llegar a un cruce y se paran si tienen delante al jugador
u otro coche; si llevan más de 4 s parados arrancan despacio para deshacer atascos. Un cuerpo
cinemático empuja a la moto pero no se deja empujar: es lo que hace que chocar con el tráfico
sea un rebote y no un billar. Cuando Wifly se sube a uno, sale de la lista de tráfico y se
crea un `Coche` dinámico en su sitio: a partir de ahí se conduce, se aparca y se abandona
como cualquier otro. Los semáforos quedan para otra noche; los nodos ya vienen en el nivel.

**El coche comparte modelo arcade con la moto pero sobre un cuboide.** Más lento en girar
parado (necesita rodar), derrape más largo y rebote más blando. Velocidad punta 21 m/s.

## 2026-09-08 — Marcador del jugador en vez de transparentar edificios

La cámara mira desde el sur, así que un bloque de diez plantas tapa la calle que tiene al
norte, y ahí desaparecía la moto. Las dos soluciones habituales son transparentar los
edificios que se interponen o marcar al jugador por encima de todo. Se ha hecho lo segundo
(anillo en el suelo y punta sobre la cabeza sin test de profundidad) porque es gratis, no
rompe la estética de bloques sólidos y es lo que hacen los GTA desde arriba. Si en el móvil
resulta insuficiente, lo siguiente es atenuar los edificios entre cámara y jugador.

**Dos subpasos de física por frame como máximo.** Con el navegador a 10 fps (SwiftShader),
tres subpasos de Rapier con 60 cuerpos y el trimesh del barrio se comían 7,7 ms del update.
Con dos, el juego va a cámara lenta por debajo de 30 fps en vez de tragarse CPU; a 60 fps
no cambia nada.

## 2026-09-08 — Policía Local: calor, estrellas y patrullas cinemáticas

**Las estrellas son tramos de un "calor" que sube con cada fechoría** (un cono 4, un atropello
22, robar un coche 35, chocar con una patrulla 40) y baja con el tiempo solo si ninguna
patrulla te tiene a menos de 55 m. Así las gamberradas pequeñas no llaman a nadie hasta que
se acumulan, y perderlas de vista es lo que te limpia. Lógica pura en `src/policia/busqueda.ts`
con tests.

**Las patrullas son cinemáticas, como el tráfico,** y persiguen por el grafo con Dijkstra hasta
el nodo más cercano al jugador (ruta recalculada cada 1,5 s). A menos de 26 m y sin edificios
en medio (un rayo de Rapier contra los cuerpos fijos) van a por ti en línea recta. **La
asimetría del barrio está aquí:** los coches patrulla solo usan aristas rodadas y no entran en
modo directo si estás en un pasaje; las motos de la Local, que aparecen a partir de la tercera
estrella, usan todo el grafo y sí se meten.

**Trincado = parado a menos de 3,2 m de una patrulla durante 1,1 s.** Mientras vas a más de
12 km/h no te trincan: puedes rozarlas. Al trincarte pierdes el 20 % del dinero y te sueltan
en el Mercado con tu moto (no hay comisaría en la caja; la de Pino Montano queda fuera).

**Sin semáforos todavía.** Los nodos `traffic_signals` están en el nivel, pero el tráfico
frena en todos los cruces igual y con 14 coches nadie los echa de menos.

## 2026-09-08 — Día y noche sin luces puntuales

Un día de juego dura **10 minutos reales** y arranca a las 17:30, que es cuando el barrio está
vivo. Cambian el color del cielo, el color e intensidad del sol (que además gira para que las
sombras se muevan) y la luz ambiente. De noche no hay farolas de verdad: en móvil cada luz
puntual cuesta, y con la cámara alta la sensación de noche la dan el cielo oscuro y el tinte
azulado del ambiente. La hora se guarda con la partida y se ve en el HUD.

**Tecla R: vuelta al Mercado.** Sin comisaría ni "reaparecer" en el menú, hacía falta una salida
para quedarse encajado entre un contenedor y un bloque. Solo en teclado; en móvil basta con
volver a abrir la página si pasa (se guarda cada 5 s).

## 2026-09-08 — Tráfico y patrullas dinámicos, y paso de física variable

**Los coches del tráfico y las patrullas pasan de cinemáticos a dinámicos pesados.** Un cuerpo
cinemático que se mete en el del jugador hace que Rapier lo expulse a la velocidad que haga
falta: el coche marcaba 2.208 km/h en el HUD y podía acabar dentro de un bloque. Ahora son
dinámicos con rotación bloqueada, densidad alta y velocidad fijada cada paso hacia donde
quieren ir; empujan de verdad, pero un contenedor o una fachada los para. Tras cada paso se lee
dónde han acabado y se recalcula su posición en el carril. Además moto y coche recortan
cualquier velocidad que pase de 1,4 veces su máxima, por si acaso.

**Paso de física variable en vez de cámara lenta.** Con tope de dos subpasos de 1/60 s, por
debajo de 30 fps el mundo iba más lento que el reloj (en la Pi a 10 fps, a un tercio), y las
patrullas parecían tortugas. Ahora el paso crece hasta 1/20 s cuando el frame es lento: tiempo
real hasta 20 fps y degradación suave por debajo. A 60 fps no cambia nada.

## 2026-09-08 — Mecheros, faros, pasos de cebra y por qué no hay semáforos

**Los 20 mecheros** (el minijuego del brief) están repartidos por pasajes, mercado y bares, a más
de 45 m entre sí, y se guardan aparte de la partida para que no se pierdan al volver al Mercado.
Cada uno da 10 €; el vigésimo, un aviso de rey del barrio.

**Faros de noche:** dos conos aditivos delante del vehículo, sin luz real. Basta para que se
lea que es de noche y que vas en moto.

**No hay semáforos en la caja.** OSM no trae ningún `highway=traffic_signals` en estos 500 m
(Pino Montano es de rotondas, pasos de cebra y ceda el paso), así que los "semáforos simples"
del brief no aplican aquí: el tráfico frena en todos los cruces y ya está. Sí hay 13 pasos de
cebra (`crossing:markings=zebra`) y se pintan. Ojo con Overpass: `out body` + `out skel`
devuelve los nodos etiquetados dos veces, la segunda sin etiquetas; el generador ahora se queda
con la etiquetada (era el motivo de que saliesen 0 pasos).

**Trincar a 5,5 m entre centros.** Con 3,2 m nunca pasaba: dos coches morro con culo ya distan
3,9 m. Y la patrulla se para al llegar, porque si sigue empujando, el jugador no deja de moverse
y el contador de "parado" no arranca.

## 2026-09-08 — Daño de vehículos sin barra de vida

Cada vehículo tiene una salud de 100 que baja con los golpes fuertes (solo cuando lo conduces:
que el tráfico te empuje la moto aparcada no la rompe). Por debajo de 30 echa humo; a 0
revienta: fogonazo, sacudida, Wifly se baja solo y esa moto ya no arranca (y no te puedes
subir a una reventada). No hay barra de vida en el HUD a propósito: el humo es la barra. Volver
al Mercado (trincado o tecla R) te devuelve la moto nueva.

**Claxon (H, botón PIII, Y del mando):** suena y asusta a los vecinos a 14 m. Es lo que hace
que cruzar un pasaje lleno de gente a bocinazos tenga gracia.

## 2026-09-08 — Pulido para el móvil de la primera noche

- **Pantalla completa al pulsar JUGAR** en pantallas táctiles: sin la barra del navegador cabe
  más barrio y el joystick no dispara gestos del sistema.
- **Mapa de sombras a 1024** en calidad alta (era 2048): en un móvil de gama media es la mitad
  de relleno por frame y desde 66 m no se nota.
- **Cámara según lo que lleves:** 50 m a pie, 66 en moto, 72 en coche, más el retroceso por
  velocidad. A pie se ve a Wifly; en coche se ve la calle.
- **Daño más blando:** un golpe a fondo quita unos 12 puntos en vez de 25. Reventar la moto
  tiene que costar una mala tarde, no cuatro esquinas.

## 2026-09-09 — El 13 sin streaming: un `Barrio` que se destruye y se recrea

**Cada barrio es un objeto `Barrio`** (grupo de escena + mundo de Rapier + población: trastos,
vecinos, tráfico, patrullas, mecheros, paradas, rótulos, ventanas). Viajar en el 13 es destruir
el objeto entero (geometrías, texturas y `world.free()`) y construir el otro; la moto y Wifly se
recrean en el mundo nuevo. Lo que persiste vive en `Juego`: dinero, cielo (hora), estadísticas,
garaje, HUD. Comprobado que no hay fugas: tras ida y vuelta, mismas geometrías y una textura.

**Se llega siempre a pie a la parada de llegada** (`paradaLlegada` de la ficha, por trozo del
nombre de la `bus_stop` de OSM), con la moto que llevabas aparcada al lado. El punto de reaparición
(trincado, tecla R) es la calle rodada más cercana a esa parada, así que "el Mercado" en Pino
Montano y "la Alameda de Hércules" en la Alameda sin código especial.

**La cinemática no espera al bus de vuelta:** son 4,5 s del bus saliendo con cámara baja y
fundido a negro; al negro se carga el barrio (2-3 s en la Pi) y se levanta el velo. No hay bus
"llegando" al otro lado porque no aporta y dobla la cinemática.

**Bug heredado:** el commit de la noche anterior que metió el día y la noche borró sin querer
el bloque que atendía a `controles.accion` (E / SUBIR-BAJAR), y `reaparecer` (R) nunca llegó a
leerse en `juego.ts` aunque la nota dijera que existía. Arreglado esta noche; ahora la
verificación pulsa E en las sondas.

## 2026-09-09 — Perfiles de barrio en el generador y la Alameda de cal y albero

Los colores y las plantas por defecto salen del **perfil** del barrio en `tools/genera_nivel.py`
(`PERFILES`), no de constantes globales: la Alameda va con paleta de casco antiguo (cal, albero,
ocre, terracota), tres plantas por defecto y 3,2 m por planta. Pino Montano regenerado con su
perfil sale byte a byte igual que antes. La Alameda trae 103 `natural=tree` reales (la hilera de
la Alameda de Hércules) y ahora se plantan donde están antes que los procedurales.

## 2026-09-09 — Rótulos en un atlas, sobre la azotea del local

Los nombres de bares y comercios se pintan en **un solo canvas** (celdas de 256x48, ocho por
fila) y cada rótulo es un plano con las UV de su celda, fundidos por losetas. Están
**inclinados 58° hacia la cámara** (que nunca gira, así que la inclinación es fija) y, cuando el
POI cae dentro de un edificio (casi siempre: OSM pone el nodo del comercio dentro de la huella),
el cartel va **sobre la azotea**, que es lo que la cámara ve. Sin anisotropía: en render por
software costaba y los carteles ya miran a la cámara.

## 2026-09-09 — El gate de rendimiento: relativo entre barrios y mejor de dos ventanas

**Los petos de azotea solo en bloques de cuatro plantas o más.** En el casco antiguo (879 casas de
dos y tres plantas con huellas irregulares) eran 8.400 cajas, cien mil triángulos que desde 66 m
no se distinguían. Las azoteas de la Alameda bajan de 196k a 105k triángulos y el barrio pasa de
rendir la mitad que Pino Montano en la Pi a rendir igual.

**El segundo barrio se mide igual que el primero** (3 s de calentamiento, dos ventanas de 10 s) y
el listón es **relativo**: al menos la mitad de frames que el barrio inicial. Un umbral absoluto
(los "40 frames en 5 s" de la primera versión) aprobaba o suspendía según qué más estuviera
haciendo la Pi. Y la mediana del `update()` también se queda con la **mejor de las dos ventanas**:
la misma build daba 5,7 y 8,7 ms en pasadas seguidas.

Lección de proceso apuntada: encadenar `npm run verificar | tail && git push` publica aunque la
verificación falle, porque el código de salida es el de `tail`. Ahora se guarda el código de
salida y solo se publica si es cero.

## 2026-09-09 — Triana, tercer barrio, y cada parada del 13 va a un sitio

Con el hito 5 cerrado y la guía escrita, la mejor prueba de que "añadir un barrio" son cuatro
pasos era añadir uno: **Triana** (caja de 500 m alrededor de San Jacinto y Pagés del Corro, con
Calle Betis, Pureza, el Mercado de Triana y el Castillo de San Jorge). 1.214 edificios, 3 paradas,
36 bares. Ha salido en media hora, casi todo esperando a Overpass.

**Con tres barrios, `destino13` pasa a `destinos13: string[]`** y cada parada del barrio lleva a
un destino, repartidos por turnos en orden de nombre. No hay menú de destinos: la parada decide,
como en la vida real, y el aviso al acercarte dice a dónde va. El test comprueba que desde
cualquier barrio se llega a todos.

**Huellas simplificadas en el generador** (fuera los vértices que se desvían menos de 30 cm del
segmento entre sus vecinos): Triana pasa de 10.900 a 10.150 vértices y la Alameda de 8.400 a
6.900 sin que se note. Pino Montano se regenera y ya no es byte a byte igual al de la primera
noche (2.972 → 2.854 vértices). Y los petos de azotea, además de cuatro plantas, piden 150 m² de
huella: en Triana había cientos de casas altas y estrechas con peto.

**Lo que Triana no tiene todavía:** el río. La caja toca Calle Betis pero el Guadalquivir es una
relación multipolígono que el generador no lee (solo vías cerradas para zonas). Queda anotado en
el roadmap: agua como zona, y de paso el puente.

## 2026-09-09 — El minimapa se pinta dentro del WebGL, y el gate mira el termómetro

**Minimapa como quad en una escena ortográfica**, no como `<canvas>` del DOM encima del juego.
Es un canvas 2D (el barrio pintado una vez a 1 px/m, recorte centrado en el jugador a 5 Hz) que
se sube como textura y se pinta en una segunda pasada sin borrar. Motivo: un canvas superpuesto es
una capa aparte para el compositor del navegador, y en la Pi (sin GPU) pareció costar un 25 % de
los frames. La zona táctil para plegarlo sigue siendo un `div` transparente en el mismo sitio.

**Lo que de verdad pasaba: la Pi estaba estrangulando por temperatura.** Cuatro verificaciones
seguidas fallaron con 100, 108, 114, 80 y 70 frames (el listón son 120) y cada cambio "para
aligerar" daba peor. `vcgencmd get_throttled` marcaba `0xe0000` (ha habido tope de frecuencia y
estrangulamiento) y 73 °C tras una hora de Chromium sin parar. Ninguna sonda A/B es fiable en
ese estado. Regla nueva: `verificar.mjs` imprime temperatura y estado de estrangulamiento al
empezar, y si el gate falla con el flag activo, **se espera a que baje** antes de tocar código.

## 2026-09-10 — Semáforos de OSM: pocos, pero de verdad

El generador ya exportaba `semaforos`, pero solo los `highway=traffic_signals` y con eso salían
cero en el Mercado y dos en Triana. Ahora cuenta también los pasos con `crossing=traffic_signals`
siempre que estén sobre una calle rodada: 2 en Sembradores (Mercado), 11 en Triana (Pagés del
Corro con San Jacinto, San Jacinto con Pureza, Pagés del Corro con Clara de Jesús Montero), 0 en la
Alameda. Se agrupan por cercanía (32 m) en **cruces** con dos ejes que se turnan: 9 s de verde,
2 de ámbar, ciclo de 22 s, con desfase por cruce. El poste va en la acera derecha según se llega,
con la cabeza entera del color de la luz (desde 66 m una lucecita no se ve; una caja de medio
metro sí). El tráfico para a 7 m de un rojo (y no cuenta como atasco: antes de esto, cuatro
segundos parado hacían que el coche arrancara "para deshacer el atasco"). Las patrullas no
respetan semáforos: van con sirena. Saltárselo en rojo a más de 3 m/s son 12 de calor y una
frase; a pie no cuenta.

## 2026-09-10 — El Recadero: encargos entre locales con nombre real

Minijuego, no misión: no hay historia ni diálogo, es el "taxi" de los GTA con bolsas de papel.
Los **locales** son los POIs con nombre de las clases bar, cafetería, panadería, kiosco, farmacia,
supermercado y mercado; la **puerta** es el nodo del grafo más cercano al POI, porque el nodo de
OSM cae casi siempre dentro del edificio. Tres locales por barrio tienen bolsa (a más de 110 m
entre sí y lejos de la parada, de las pancartas de carrera y de las motos aparcadas); pasar por
la bolsa en vehículo arranca el encargo hacia otro local a 90-320 m en línea recta, con
`12 + distancia/5` segundos. Entregar encadena el siguiente desde ese mismo local con un 25 % más
de premio por eslabón (tope ×3); se pierde la cadena al agotarse el tiempo, al bajarse, al
trincarte o al caer al río. En Pino Montano casi todos los locales con nombre son farmacias y el
mercado (OSM no tiene los bares del barrio con nombre): encargos de farmacia, que también es muy
de barrio. El destino sale en el minimapa como objetivo cuando no hay carrera en curso.

## 2026-09-10 — Tribus por barrio y logros

Cada `FichaBarrio` lleva una **tribu** (`canis`, `modernos`, `trianeros`) que decide la ropa de
los vecinos, si llevan gorra plana (canis), gorro de lana (modernos) o nada (trianeros), y qué
te gritan. Es la guerra canis-pijos del brief en su versión freestyle: solo pinta y frases, sin
bandos ni misiones. Los pijos de verdad (Los Remedios, Nervión) llegarán con sus barrios; Triana
va de castiza y la Alameda de moderna, que es lo que son. Dos de cada tres vecinos llevan gorro
(según su índice de color, que es fijo, para no parpadear).

**Logros** (`src/logros.ts`): 22 metas sacadas de las estadísticas acumuladas, se comprueban cada
dos segundos y se guardan en `pinoloko.logros.v1`. Van en su pestaña del menú. Para que "los 20
mecheros de un barrio" y "30 mecheros" fueran logros ha hecho falta contar mecheros en las
estadísticas (antes solo se guardaban por barrio).

## 2026-09-10 — Pachangas: el balón es un cuerpo de verdad

Niños jugando al fútbol en los campitos (`leisure=pitch`, `playground`) y, si no hay, en los
pasajes `pedestrian` de 5 m o más: cuatro por barrio, a más de 60 m entre sí y lejos de la
parada, las pancartas y las bolsas. El balón es una esfera dinámica de Rapier (55 cm de radio:
uno real desde 66 m es un píxel) con CCD para que la moto no lo atraviese; la portería tiene
postes y red con colisión, así que el balón se queda dentro. Los niños no tienen cuerpo: corren al
balón, lo chutan hacia la portería con un desvío grande, y **se apartan** si vienes lanzado.
No se les atropella: es la línea del tono. Gol del jugador (si tocó el balón en los últimos 4 s)
son 40 € y fanfarria; los de los niños solo un aviso de vez en cuando si andas cerca. Si el
balón se va a más de 45 m del campo, vuelve al centro.

**Vibración** (`navigator.vibrate`) en golpes fuertes, atropellos, reventones y goles; `?vibrar=0`
la apaga. **Repetición**: al reventar un vehículo, 2,2 s de cámara baja orbitando el punto (la
segunda excepción a la cámara alta, junto al 13); el juego sigue corriendo debajo.

## 2026-09-10 — Calidad gráfica elegible, y lo que dice la auditoría de draw calls

Tres calidades: **alta** (sombras de 1024, antialias, DPR hasta 1,5, bordes en los edificios),
**media** (sombras de 512, sin antialias, DPR 1, sin bordes) y **baja** (sin sombras, DPR 0,5,
sin aceras ni líneas). Se decide sola (sin GPU baja; táctil y pantalla pequeña media; el resto
alta), se puede cambiar en la pestaña AYUDA del menú y se guarda en `pinoloko.calidad`. Cambiarla
recarga, porque el barrio se construye distinto según ella. `?calidad=` sigue mandando sobre todo.

La auditoría con `scripts/sonda-calls.mjs` (calidad alta, 390x844): **108-130 draw calls y
49-60k triángulos por frame** en los tres barrios, de día y de noche, parado y en marcha. Eso es
poco para un móvil de gama media; si va a tirones será por relleno (sombras y DPR), que es lo que
baja la calidad media. `renderer.info` se copia justo después de la pasada principal porque la
del minimapa lo pisaba (antes la sonda leía "6 calls").

## 2026-09-10 — Sevici por el carril bici, campanas y modo foto

**Sevici**: ciclistas sin física por las aristas cuya vía es `cycleway` (12 en el Mercado, algunas
en Triana, ninguna en la caja de la Alameda: ahí no hay). Tocan el timbre si te tienen delante a
menos de 7 m y se caen si los atropellas (30 €, calor de atropello, y a los tres segundos siguen).
Bici verde con cesta gris y ciclista encima en una sola geometría instanciada.

**Campanas**: a cada hora en punto, si hay un `place_of_worship` a menos de 200 m (Pino Montano
tiene su parroquia en la caja), suena una campana FM sintetizada; tres a las doce y a las ocho.
Solo de 8 a 21: de noche no tocan.

**Foto** (P o el botón 📷): captura del canvas en el mismo frame (sin `preserveDrawingBuffer`
solo vale ahí), franja abajo con el logo, calle, hora y barrio, atribución a OSM, y hoja de
compartir del móvil (`navigator.share` con ficheros) o descarga si no la hay.

## 2026-09-10 — Helicóptero, mercadillo, furgonetas y pistas

**Helicóptero** a cinco estrellas: orbita a 30 m sobre el jugador con un foco que lo persigue a
9 m/s como mucho; mientras el foco te tiene (a menos de 7 m) el calor no baja, y con la moto a
fondo y cambiando de dirección se le escapa. Vive en la escena, no en el barrio, para que no lo
destruya un cambio de barrio (se retira de golpe al viajar, al trincarte o al bajar de cuatro
estrellas se va volando). Sonido: ruido grave batido a 13 Hz.

**Mercadillo**: nuevo trasto `puesto` (tablero, género, dos postes y toldo a rayas en tres
colores), diez en hilera por el pasaje `pedestrian` más cercano al `marketplace`, a menos de
80 m. Se rompe en trozos como las cajas. No he encontrado en OSM dónde se pone el mercadillo de
verdad en Pino Montano, así que va pegado al Mercado.

**Furgonetas**: una de cada cuatro entradas del tráfico es furgoneta de reparto (silueta alta,
blanca el 70 % de las veces). Se roba como un coche y conserva su silueta (apariencia con la
misma caja de colisión que el utilitario, densidad de bus).

**Pistas**: la primera vez que pasa algo (parado cuatro segundos en la moto, a pie, primera
estrella, tres estrellas, cerca de una bolsa, una pancarta, una pachanga, una rampa o un coche
del tráfico) sale una frase que explica qué hacer. Se guardan en `pinoloko.pistas.v1` y NUEVA
PARTIDA las borra. Sin tutorial ni pantalla de ayuda obligatoria: el barrio te lo va contando.

## 2026-09-10 — El taller: en qué gastar el dinero

Hasta hoy el dinero no servía para nada: se ganaba con los destrozos y se perdía al trincarte.
Ahora hay **taller** dentro de la pestaña GARAJE: cuatro mejoras por moto (tubarro, variador,
neumáticos, frenos) en tres niveles, con precios que suben (80-600 €). Multiplican los ajustes del
modelo (`aplicarMejoras`): +7 % de punta por nivel de escape, +10 % de arranque por variador,
+8 % de agarre y +5 % de giro por neumáticos, +12 % de frenada por frenos. El tubarro además sube
el tono del motor. Las mejoras son **por modelo** (la Jog tuneada no tunea la Zip) y se guardan
en `pinoloko.taller.v1`, que NUEVA PARTIDA borra con el resto. Se aplican al crear la moto, al
cambiarla desde el garaje y al subirte a una robada del mismo modelo.

## 2026-09-10 — Farolas, perros y bocinazos; y el gate resuelto con un A/B

**Farolas** cada 28 m por las calles rodadas (aceras alternas, brazo hacia la calzada), postes
instanciados; de noche se enciende la cabeza y un charco de luz aditivo de 5,5 m en el suelo.
Sin luces puntuales: el ambiente ya lleva el tinte cálido y en móvil las luces cuestan.

**Perros callejeros** (7 en Pino Montano, 6 en los otros): vagan por el grafo peatonal, si pasas
a menos de 14 m con la moto te persiguen ladrando (7 m/s: no te alcanzan a fondo, sí por los
pasajes) durante 4-6 s y luego se cansan. Si vas a llevártelos por delante saltan a un lado: a los
perros no se les atropella, como a los niños. El primer intento tenía un bucle (el salto
reiniciaba la persecución y el perro no se cansaba nunca): el salto lleva ahora su propio reloj.

**Bocinazos**: un coche del tráfico con el jugador delante más de 2,5 s pita y suelta una frase;
se enfría 4 s para no ser un concierto.

**El gate y el taller**: el commit del taller falló el gate dos veces seguidas (112 y 109 frames,
listón 120) sin tocar nada por frame. Un A/B con `scripts/sonda-ab.mjs` (la build anterior en un
`git worktree` contra la nueva, dos rondas alternas) dio [81,109]/[64,144] contra
[64,138]/[85,110]: la misma distribución, con la Pi a 80 °C. Se publicó. Regla: dos fallos
seguidos se resuelven con el A/B, no adivinando; y nada de lint ni builds mientras mide.

## 2026-09-10 — Caballito, abuelas con carrito, el camión de Lipasam y el minimapa apaisado

**Caballito**: acelerando a fondo por debajo del 45 % de la punta, el chasis pivota sobre la
rueda trasera hasta 0,38 rad (más con más variador). Solo visual: no cambia la física. Es lo que
hace que arrancar en un semáforo "se sienta" como una 49 preparada.

**Abuelas con carrito**: una de cada cinco vecinas (por índice de color) arrastra un carrito de
la compra granate, instanciado aparte, solo cuando pasea o huye (sentada no).

**Camión de Lipasam**: un tipo más de tráfico (`camion`), uno por barrio, a 5 m/s, cabina blanca
y caja verde de 7,5 m. Se roba como el 13 (ajustes `CAMION`: más lento y con giro de tráiler) y
la cámara se aleja igual que con el bus (por el largo de la apariencia, no por el nombre).

**Minimapa en apaisado**: con el móvil tumbado el disco va a la izquierda bajo el nombre de la
calle, porque a la derecha se pisaba con SUBIR/BAJAR. En vertical sigue bajo ☰ y 📷.

## 2026-09-10 — Mapa del barrio, ambiente sonoro y olés

**MAPA** en el menú: el mismo canvas que pinta el minimapa (el barrio a 1 px/m, una vez por
barrio) escalado a la caja del menú, con paradas, bolsas de encargo, pancartas, pachangas, rampas
y tu posición. **Los mecheros no salen**: son para buscarlos; el mapa solo dice cuántos llevas.

**Ambiente**: pájaros de día (grupitos de dos a cuatro blips agudos cada 1,5-5,5 s), grillos de
noche (tres pulsos a 4,3 kHz cada medio segundo) y bullicio de bar (ruido por paso banda con el
volumen ondulando) cuando estás a menos de 22 m de un bar, cafetería o restaurante. Todo con los
mismos osciladores del resto del juego: sin ficheros de audio. Y los vecinos jalean un vuelo de
más de 0,8 s si hay alguno a menos de 20 m.

## 2026-09-10 — Motos callejeras: canis en scooter que se roban en marcha

Faltaba lo más de barrio: **scooters circulando** (10 en Pino Montano, 8 en Triana, 6 en la
Alameda). Recorren **todo el grafo**, calles y pasajes (a 7 y 5 m/s), como haría un cani, sin
física: una malla instanciada por modelo (color del modelo, cani con gorra encima). Si los
embistes con un vehículo, el motero cae y la moto se queda cuatro segundos en el suelo (30 €,
calor de atropello). A pie y con E a menos de 3,4 m (rodando o caída), la moto pasa a ser una
`Scooter` de verdad con ese modelo, con calor de robo de moto y, si es nueva, al garaje. Es el
"robar motos en marcha" del brief en la versión que cabe en una noche: sin cuerpo físico hasta
que es tuya, así que no empujan ni les afectan los trastos.

## 2026-09-10 — Claxon musical, zumbido de las motos y bocina grave

Quinta mejora del taller: **claxon musical** (200/300/400 €): La Cucaracha, Cumpleaños feliz y
la marcha del Toreador de *Carmen*, todas tradicionales o de dominio público, en onda cuadrada,
y asustan a los vecinos en un radio mayor. Es el detalle más cani que cabía en un taller. Las
motos callejeras que pasan a menos de 12 m sueltan un **zumbido** de sierra que baja de tono
(Doppler de juguete, uno cada 1,2 s como mucho). El 13 y el camión pitan **grave** (×0,55).

## 2026-09-10 — Dinero que flota y combo que se oye

Cada euro ganado sale ahora **flotando** en pantalla donde ha pasado (sobre el trasto, el balón)
o sobre Wifly, con un `div` animado por CSS de 1,1 s (tope de 14 a la vez), en amarillo y más
grande cuando hay multiplicador. El pitido de cada trasto derribado **sube de tono con la racha**
(60 Hz por trasto hasta doce): el combo se oye además de verse. Es la parte "arcade de 1999" que
faltaba en el feedback: el marcador de arriba a la derecha no lo mira nadie mientras conduce.

## 2026-09-10 — Los bancos de OSM, con abuelo sentado

`nivel.bancos` (los `amenity=bench` de OSM: 14 en el Mercado, 14 en Triana, 4 en la Alameda)
estaba exportado desde la primera noche y sin usar. Ahora son un trasto más (`banco`: tablones de
madera con patas de fundición, 60 kg, 20 €), orientados hacia la vía más cercana, y cada uno es
un asiento para un vecino (van a la misma lista de `asientos` que las sillas de las terrazas, así
que los primeros vecinos del barrio se sientan ahí). Exprimir OSM antes de inventar.

## 2026-09-10 — Los textos flotantes se comían la mitad de los frames (y el A/B lo cazó)

La primera versión del dinero flotante fallaba el gate dos veces y el A/B contra la build anterior
dio [66,138]/[71,147] contra **[31,49]/[67,115]**: esta vez no era calor. La causa: cada `div`
animado con `scale` y `text-shadow` obliga al navegador a rasterizar y componer la capa en cada
frame, y sin GPU (SwiftShader) eso cuesta más que el juego entero. Arreglo: solo `translate` y
`opacity` (animación de compositor), `will-change`, contorno con `-webkit-text-stroke` en vez de
sombra, 0,9 s y **cinco a la vez como mucho**. Con eso el A/B vuelve a solaparse
([76,126]/[61,139] contra [62,135]/[42,125]). Lección: cualquier cosa del DOM que se anime por
encima del canvas hay que medirla, no solo lo que va dentro del WebGL. En un móvil con GPU no se
habría notado, pero el gate de la Pi es la única alarma que tengo de noche.

**Al final, fuera:** ni con la versión barata el gate pasó (103 frames, update 8,3 ms), así que
los textos flotantes se han quitado del todo y se queda solo el pitido de combo. Queda apuntado en
el roadmap hacerlos como sprites dentro del WebGL (un plano con textura de canvas por texto,
como los rótulos), que es donde no cuestan.

## 2026-09-10 — Cierre: lo que no aprueba el gate no va a `main`

Tras quitar los textos flotantes el gate siguió fallando (103-104 frames, update 7,9-8,3 ms)
con los bancos y el pitido de combo dentro, y el A/B de esa build había dado cifras normales.
Con la Pi a 80 °C y sin tiempo para otro A/B en frío, la decisión es la del protocolo: **`main`
se queda en el último commit verificado** (`f244af1`, el claxon musical) y los bloques 18-19 van
a la rama `pendiente-2026-09-10`, subida a GitHub. Los documentos y las sondas nuevas sí entran
en `main` porque no cambian la build. El A/B en frío hecho al cerrar (62 °C de salida) da la
rama un 10-15 % por debajo de `main` ([54,110]/[67,100] contra [71,128]/[48,118]): poco, pero
consistente, y por eso se queda aparcada. Sospecha principal: los catorce cuerpos de los bancos
(60 kg, cuboides) alrededor del Mercado, que es justo por donde mide el gate.

## 2026-09-11 — La rama pendiente entra: el "10-15 % menos" era la Pi, no los bancos

A/B en frío al empezar la noche, `main` (f244af1) contra la fusión con bancos + pitido + dinero
flotante en WebGL: [59,129]/[63,98] contra [54,100]/[57,120]. Las distribuciones se solapan y la
sonda de cuerpos despiertos da cero con los 14 bancos cerca del Mercado (nacen dormidos y los
cuerpos solo existen a menos de 45 m). Conclusión: la Pi hoy rinde en general por debajo del
umbral de 120 frames en la ventana de Pino Montano (100-130 en cualquier build, y 143-154 en el
último barrio del recorrido), así que el gate se lee con el A/B y no con el número absoluto. Los
bloques se han publicado cuando el A/B o el barrio final del recorrido demostraban que no había
regresión. Si esto sigue así, tocará bajar el umbral a 100 o medir con la media de dos pasadas.

## 2026-09-11 — Dinero flotante como sprites: seis planos con textura de canvas

`src/efectos/dinero.ts`: seis mallas (`PlaneGeometry` inclinado 58° como los rótulos, para mirar
a la cámara que nunca gira) con un canvas de 160x48 cada una; al soltar un "+30 €" se repinta el
canvas y se sube la textura (una sola vez por texto), y después solo se mueve la malla y baja la
opacidad. Sin `depthTest`, `renderOrder` 30. Nada en el DOM. El multiplicador va en amarillo y un
25 % más grande.

## 2026-09-11 — Los pijos existen: Los Remedios y Nervión

El brief dice "canis contra pijos" y hasta hoy no había ni un pijo. Los Remedios (caja sobre
Virgen de Luján / República Argentina: 818 edificios, 553 con plantas reales, 9 paradas) y Nervión
(Luis de Morales / Eduardo Dato con el Sánchez-Pizjuán, 329 edificios). Tribu `pijos`: polos
pastel, jersey a los hombros (aro + mangas anudadas, como "gorro" de la tribu) y gritos propios
("¡Papá, que me han rayado el Mini!"). En territorio pijo las motos aparcadas y las callejeras son
Vespas Primavera dos de cada tres (modelo nuevo, índice `VESPA`), los coches van en blanco
nacarado, verde inglés y azul marino, y las pintadas valen el doble y calientan más. Nervión trae
solo 5 edificios con `building:levels`: el perfil pone 7 plantas por defecto. El estadio es un
tipo de edificio nuevo (`estadio`, multipolígono con el césped de hueco, 40 m de `height`) con
cuatro torres de focos en las esquinas. La llegada del 13 a Nervión es la parada de Eduardo Dato
junto al estadio, porque la de Luis de Morales cae en el borde de la caja.

## 2026-09-11 — Piques: rivales sin física por el camino más corto

Los tres canis (el Kevin, el Jonathan y la Vanessa) siguen el camino más corto del grafo
peatonal entre puntos de control (Dijkstra ya existía para la policía), a velocidad constante
calculada para tardar 1,15 / 1,35 / 1,6 veces el tiempo "bueno" de la carrera (12 s por punto),
con tope de 11 m/s. Sin cuerpo físico: no empujan ni se caen, como las motos callejeras. El
puesto sale en el HUD y ganar a los tres da 60 € extra. Nombres a propósito de barrio y con
cariño; si alguno molesta, se cambian en `NOMBRES_RIVALES`.

## 2026-09-11 — Pintadas: pulsar E, no mantener

El brief de la noche decía "mantén E", pero la entrada de acción es de flanco (una pulsación) y
compartida con subir/bajar/coger el 13. Así que la pintada es: a pie, junto al bote, **una
pulsación** de E y dos segundos quieto (si te alejas más de 2,8 m se pierde). Tiene prioridad
sobre subirse a una moto si el bote está al lado. Los textos son de barrio ("PINO MONTANO",
"WIFLY", "CANIS RULE", "PM NORTE"...), nunca contra nadie. Se guardan por barrio en
`pinoloko.pintadas.<id>.v1` y salen en el MAPA (rojo por hacer, morado hecha): no son un
coleccionable escondido como los mecheros, son un sitio al que ir.

## 2026-09-11 — Alarmas de coche: por el golpe del jugador y por la velocidad del aparcado

La primera versión miraba solo la velocidad del coche aparcado tras el golpe y no saltaba: una
scooter no mueve un coche por encima de 1,2 m/s. Ahora salta con el evento de golpe del vehículo
del jugador (más de 3) con un aparcado a menos de 4 m, y además si un aparcado se mueve a más de
0,8 m/s por lo que sea (otro coche, un contenedor). Seis segundos de dos tonos, intermitentes en
las esquinas parpadeando a 4 Hz, los vecinos a 10 m salen corriendo y calor de tres trastos.

## 2026-09-11 — El Centro es de los guiris

Sexto barrio (Campana, Plaza del Duque, la Encarnación con Las Setas; 734 edificios, 7 paradas,
472 POIs con nombre). Tribu `guiris`: sombrero de paja (ala ancha + copa baja, como "gorro"),
camiseta blanca, piel roja, y gritan en spanglish ("¡Oh my God!", "Excuse me, ¿la Giralda?").
Es la tercera tribu con humor de barrio, siempre cariñoso. Poco tráfico (8) y mucha gente (190):
el Centro es peatonal. La caja de la Catedral/Plaza Nueva se descartó por tener una sola parada.

## 2026-09-11 — Patada a pie: flanco del freno, con pulsación "pegajosa"

A pie, ESPACIO / FRENO / botón A del mando es patada al trasto o balón que tengas delante (menos
de 1,9 m y por delante), con cambio de velocidad de 7 m/s y algo de vuelo; mantenerlo sigue
siendo correr. La pulsación se registra en el evento (`frenoPulsado`) y no leyendo el estado en
el frame, porque en la Pi a 20-40 fps un toque corto de un botón táctil dura menos que un frame y
se perdía. El trasto pateado cuenta como derribado (dinero y racha) por la misma regla de siempre
(velocidad > 1,5 m/s a menos de 6 m).

## 2026-09-11 — Radares: en avenidas, y si no hay, en cualquier calle rodada larga

Tres por barrio en tramos de más de 50 m de `primary`/`secondary`/`tertiary`, separados 120 m;
la Alameda no tiene avenidas, así que ahí vale cualquier calle rodada de 40 m. Foto a más de
50 km/h en vehículo (a pie nunca), 8 s de enfriamiento por radar. El flash es un disco blanco en
el WebGL sobre el jugador (0,25 s), no un fundido del DOM (ver lo del 2026-09-10). Quita 50 €
(nunca baja de cero) y calienta como un semáforo en rojo: es la única forma de perder dinero
aparte de que te trinquen, y le da un motivo a levantar el gas en las avenidas de los pijos.

## 2026-09-11 — La Local a pie: el contrapeso de que los pasajes sean de Wifly

Hasta hoy, a pie eras intocable: ni coches ni motos de la Local llegaban a los pasajes hasta tres
estrellas. Ahora, a partir de dos estrellas y **solo mientras vas andando**, salen agentes a pie
(uno por estrella menos una, máximo tres) en un nodo peatonal a 35-80 m de tu misma componente
del grafo, que van hacia tu nodo más cercano por Dijkstra (recalculado cada 1,2 s desde el nodo
al que ya se dirigen, sin zigzag) a 4,6 m/s: Wifly anda a 5,2 y corre a 7,5, así que escapas si
no te paras. A menos de 12 m van en línea recta y sin colisiones (no tienen cuerpo: un pasaje
estrecho no les frena, pero tampoco atraviesan más que los vecinos). Con uno a menos de 1,3 m
durante 0,9 s: trincao. Se retiran al subirte a un vehículo más de 6 s, al bajar de dos
estrellas o si se quedan a más de 130 m. El camino del grafo peatonal puede ser cuatro veces la
distancia en línea recta (manzanas cerradas): se ve al agente dar la vuelta a la manzana, que
es justo lo que hace la Local de verdad.

## 2026-09-11 — Las Setas no son una caja, y los guiris pagan por el espectáculo

El `building=yes` "Setas de Sevilla" salía como un bloque de 11 m tapando la Encarnación. Ahora
es un tipo de edificio propio (`setas`, por el `name` de OSM, 26 m): el cliente no lo extruye y
pinta seis sombreros de madera (esferas aplastadas) sobre columnas en una rejilla de 3x2 dentro
de la huella. Desde arriba se lee como las Setas y la plaza queda debajo. Y los **guiris** del
Centro hacen fotos a las cafradas: un salto o una racha de cuatro trastos con dos o más guiris a
menos de 14 m suelta una propina (5 € por guiri, hasta 20 €), con enfriamiento de 5 s para que
no sea una máquina de dinero. Es el modo de que el Centro tenga su propia economía sin misiones.

## 2026-09-12 — Taxis y taxista: el minijuego clásico, sin misiones

Un taxi seguro por barrio en el tráfico (el primer coche) y uno de cada siete después: blanco
con la franja amarilla en las puertas y el cartel verde en el techo, como los de Sevilla. Se roba
como cualquier coche del tráfico. Al llevarlo, salen clientes con la mano levantada en las aceras
(muestreo de tramos de calle rodada a 40-150 m, filtrados por distancia porque el azar puro
fallaba en las esquinas de la caja), como mucho dos a la vez y se cansan a los 45 s. Parar a
menos de 4,5 m y a menos de 1,2 m/s los sube; el destino es un local con nombre real a 80-320 m
(`elegirDestino` del recadero) y el reloj, el del recadero más 8 s. Se cobra banderazo más
distancia, con más si sobra reloj y si encadenas. Bajarte deja al cliente tirado y rompe la
cadena. Es un minijuego de freestyle como el recadero: nada de historia.

## 2026-09-12 — Conductor del 13: los vecinos esperan en las marquesinas

Cada parada tiene uno o dos vecinos esperando desde el principio (estado `esperando`: quietos,
huyen solo si vienes a más de 6 m/s) y cada 2,5 s, si en una parada hay menos de dos, un vecino
que pase por su nodo se acerca andando en línea recta hasta la marquesina. Con el 13 robado y
parado a menos de 11 m, suben de uno en uno cada medio segundo y pagan 2 € (billete y propina,
redondeado). El que sube reaparece paseando en el nodo peatonal más lejano que salga en ocho
intentos: se ha bajado en otra parada. No hay bajada de pasajeros ni ruta: sería una misión.

## 2026-09-12 — La vecina del quinto: el barrio responde

Racha de tres trastos, alarma de coche o claxon pegado a un bloque (`tipo=bloque`, altura ≥ 8 m,
fachada a menos de 16 m) y la vecina se asoma al borde de la azotea en bata, grita y al segundo
tira una maceta a donde vas a estar (adelanta el 75 % de tu velocidad durante el vuelo). Vuelo
de 0,8 s más la distancia entre 30. A menos de 2,1 m del punto de caída: macetazo (empujón,
sacudida, 12 de salud). Si no, cascos en el suelo. Enfriamiento de 22 s y de día la mitad de
probable. Los gritos son de barrio y cariñosos; nunca a costa de nadie.

## 2026-09-12 — Te han levantado la moto (y chapa y pintura para recuperarte)

Si dejas la moto sola a más de 16 m durante 25 s, cada segundo hay un 8 % de que un cani (o un
pijo "para un TikTok" en Los Remedios y Nervión) se la lleve: la moto se esconde (malla oculta,
cuerpo desactivado) y nace un motero callejero encima con su modelo, que sale en el minimapa
como objetivo si no hay otro. Se recupera como se roba cualquier motero (a pie, E), sin calor
porque es tuya. Si te trincan o vas a la parada con R te la devuelven; cambiarla en el garaje
la sustituye junto a Wifly. Chapa y pintura: en Los Remedios el `car_repair` con nombre más
cercano a la parada (Talleres Ebenezer y compañía); en el resto, "Chapa y pintura Manolo" en un
nodo rodado a unos 120 m de la parada. Parado un segundo en el anillo azul con el vehículo y
100 €: la Local te olvida (calor a cero, patrullas, agentes y helicóptero fuera) y el vehículo a
100 de salud, incluida una moto reventada. Es lo que en GTA era el Pay 'n' Spray.

## 2026-09-12 — Trucos en el aire

En un salto, pasados 0,2 s en el aire, el eje horizontal gira la moto sobre sí misma (7,5 rad/s;
solo la malla, no el rumbo físico) y al aterrizar cada vuelta completa (85 % de 360º para no ser
tacaño) son 40 € extra y cuenta como truco. Es la razón para tocar el joystick en el aire, que
hasta ahora no hacía nada.

## 2026-09-12 — El corro de mirones

Cuando pasa algo gordo (un reventón, una alarma, un macetazo, un motero al suelo, la llegada de
los bomberos o del 061), hasta cinco vecinos que pasean a menos de 28 m se acercan a un círculo
de 4-5,5 m alrededor y se quedan mirando entre 7 y 13 s (estado `mirando`, huyen si vienes a más
de 6 m/s), y uno comenta ("¡Ozú, qué tela!", "¿Has llamado al seguro, niño?"). Reutiliza el
`objetivo` fuera del grafo que ya tenían los que van a la marquesina. Es lo que hace que el
barrio parezca que reacciona a lo que haces, y no cuesta nada.

## 2026-09-12 — Bomberos y el 061: espectáculo, no obstáculo

Al reventar un vehículo vienen los bomberos (camión rojo con escalera) y con una racha de tres
atropellos, la ambulancia del 061 (enfriamiento de 45 s). Entran por un nodo rodado a 110-220 m
con camino hasta el suceso (Dijkstra por el grafo rodado), a 11-13 m/s, trabajan siete o cinco
segundos junto al sitio (agua a chorros sobre la moto, que deja de arder; los atropellados de
alrededor "se van en camilla" y reaparecen lejos) y se vuelven por donde vinieron. Sin cuerpo
físico y no se pueden robar: son cinemáticos como los moteros, porque un cuerpo más de 7,5 m
persiguiendo caminos con Rapier era la clase de cosa que se atasca en un cruce y se queda ahí
toda la partida. Sirena de dos tonos con pitidos si andan a menos de 90 m. Uno de cada tipo a la vez.

## 2026-09-12 — Las marquesinas viven solas, y Lipasam es un oficio

El 13 del tráfico, al parar en una marquesina (ya lo hacía tres segundos), deja a un vecino en la
puerta (uno que paseaba a más de 100 m se teletransporta ahí: nadie lo ve llegar) y sube a los
que esperan, uno cada 0,6 s. Así las paradas tienen movimiento aunque no robes el bus. Y con el
camión de Lipasam robado, parado a menos de 6,5 m de un contenedor durante 1,1 s, el contenedor
desaparece (se marca como roto, sin trozos) y son 5 €: el tercer oficio (taxi, 13, basura), el
único honrado. No hay ruta ni cuota: no es una misión.

## 2026-09-12 — Pique callejero: el reto sale de la calle, no de una pancarta

Si vas en moto a más de 5 m/s con un motero callejero a menos de 6 m durante dos segundos (y no
estás en carrera, encargo ni trincado, con 40 s entre retos), arranca un pique callejero: ruta de
tres puntos generada al momento desde el nodo peatonal más cercano (`generarRuta`, sin semilla
fija, así que no hay récords: `indiceCarrera = -1`) con los anillos del circuito y un solo rival
(el Kevin, el rápido). Mismo premio que las carreras y 60 € por ganarle. Reutiliza todo lo de
las carreras de pancarta; lo único nuevo es el disparador y que los récords se guardan solo en
las rutas fijas.
