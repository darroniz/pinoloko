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
