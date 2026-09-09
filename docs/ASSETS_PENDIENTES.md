# Assets pendientes

Cosas que hoy son placeholders procedurales y que ganarían con un asset de verdad.
Cada entrada con descripción suficiente para generarla con IA o modelarla.

Formato:

```
## <nombre>
- Dónde se usa:
- Placeholder actual:
- Descripción para generarlo:
- Formato y tamaño deseados:
```

---


## Scooter Jog RR (y Zip SP, Sonic como variantes)
- Dónde se usa: vehículo del jugador (`src/fisica/scooter.ts`).
- Placeholder actual: cajas y cilindros rojos con Wifly de cápsula encima, escala 1,6.
- Descripción para generarlo: scooter de dos tiempos de finales de los 90 (Yamaha Jog RR, Piaggio
  Zip SP, Aprilia Sonic), low-poly (~600 triángulos), colores planos sin textura, proporciones
  redondeadas "de juguete", con escape tipo carrera a un lado. Vista desde arriba tiene que leerse
  la silueta: escudo delantero, asiento, rueda trasera pequeña.
- Formato y tamaño deseados: GLB, Y arriba, eje -Z hacia delante, 1,7 m de largo real.

## Wifly
- Dónde se usa: piloto de la scooter y, más adelante, a pie.
- Placeholder actual: cápsula blanca, piernas azules de chándal, cabeza esfera y gorra negra.
- Descripción para generarlo: cani de Pino Montano, veintipocos, gorra plana, chándal azul con
  rayas, camiseta blanca, cadena dorada, zapatillas blancas. Low-poly (~800 triángulos), colores
  planos, cabeza grande estilo cozy. Pose sentado en scooter y pose de pie.
- Formato y tamaño deseados: GLB con esqueleto simple, 1,75 m.

## Trastos de calle
- Dónde se usa: `src/mundo/trastos.ts` (cono, maceta, contenedor, papelera, mesa, silla, caja de fruta, valla de obra).
- Placeholder actual: primitivas fundidas con colores planos.
- Descripción para generarlo: versiones low-poly (100-200 triángulos cada una), colores planos,
  proporciones exageradas para que se lean desde 66 m de altura. Contenedor verde de Lipasam,
  maceta de geranios, mesa y silla de terraza de bar con publicidad de Cruzcampo, caja de fruta
  con naranjas.
- Formato y tamaño deseados: GLB, escala real, origen en la base.

## Árboles
- Dónde se usa: `src/mundo/azoteas.ts` (`construirArboles`).
- Placeholder actual: tronco cilindro + copa icosaedro.
- Descripción para generarlo: naranjo, plátano de sombra y jacaranda low-poly (~150 triángulos),
  copa redonda tipo bola de helado, colores planos.
- Formato y tamaño deseados: GLB, 4-7 m de alto.

## Autobús de Tussam (línea 13)
- Dónde se usa: cinemática del viaje (`src/cinematica.ts`) y tráfico robable (`src/mundo/trafico.ts`).
- Placeholder actual: caja blanca de 12 m con franja roja, banda de ventanas azul y letrero amarillo.
- Descripción para generarlo: autobús urbano de Tussam (blanco y rojo, dos puertas, letrero de
  línea "13 PINO MONTANO" en el frontal), low-poly (~800 triángulos), colores planos. Desde
  arriba tiene que leerse el techo blanco con los aires acondicionados y la franja roja lateral.
- Formato y tamaño deseados: GLB, -Z hacia delante, 12 m de largo real.

## Parada de bus
- Dónde se usa: `src/mundo/paradas.ts`, una por cada `bus_stop` de OSM.
- Placeholder actual: poste gris con cartel blanco y franja roja, marquesina de cristal azulado.
- Descripción para generarlo: marquesina de Tussam (techo curvo, banco, panel lateral con el
  plano) y poste con el disco de parada. Low-poly (~200 triángulos), colores planos.
- Formato y tamaño deseados: GLB, origen en la base del poste, 3,5 m de alto.

## Pancarta de salida y anillos de carrera
- Dónde se usa: `src/mundo/circuito.ts`.
- Placeholder actual: dos postes con banda a cuadros y salida pintada en el suelo; anillos toroidales amarillos.
- Descripción para generarlo: pancarta hinchable de carrera de barrio (a cuadros, con
  "SALIDA" y un patrocinador de cachondeo tipo "Kebab Pino Montano"), y un anillo de meta
  con banderines. Colores planos, ~300 triángulos.
- Formato y tamaño deseados: GLB, 7 m de ancho la pancarta.

## Rampa de salto
- Dónde se usa: `src/mundo/rampas.ts` (seis por barrio en los pasajes anchos).
- Placeholder actual: cuña de 4,2 x 2,6 x 1,25 m con rayas amarillas y negras y laterales oscuros.
- Descripción para generarlo: rampa de madera de palés con rayas de obra, algo destartalada,
  low-poly (~120 triángulos).
- Formato y tamaño deseados: GLB, origen en el pie de la rampa, -Z hacia arriba de la cuña.

## Rótulos de comercios
- Dónde se usa: `src/mundo/rotulos.ts` (atlas de canvas con el `name` de OSM).
- Placeholder actual: tablero redondeado de color por gremio con texto en la fuente del sistema.
- Descripción para generarlo: una fuente rotulista de bar de barrio (tipo cartel pintado a mano,
  gruesa, ligeramente irregular) en formato web (woff2) con licencia libre, para que los
  rótulos no dependan de la fuente del móvil.
- Formato y tamaño deseados: woff2, latín con tildes y eñe.

## Coche patrulla y moto de la Policía Local
- Dónde se usa: `src/policia/patrullas.ts`.
- Placeholder actual: utilitario blanco con franja azul y luz que alterna azul/rojo; moto de cajas.
- Descripción para generarlo: coche y scooter de la Policía Local de Sevilla (blanco y azul, con
  el escudo y "POLICÍA LOCAL" en el lateral), low-poly, colores planos, luces en el techo.
- Formato y tamaño deseados: GLB, escala real, -Z hacia delante.

## Balón, portería y niños de la pachanga
- Dónde se usa: `src/mundo/pachangas.ts` (campitos y pasajes anchos).
- Placeholder actual: esfera a cuadros blanca y negra (55 cm), portería de cilindros blancos con
  red translúcida, niños como cápsulas pequeñas con camiseta roja o azul.
- Descripción para generarlo: balón de reglamento estilo "Tango" low-poly (~200 triángulos),
  portería de barrio de tubo blanco con red, y dos niños de 1,1 m (uno con camiseta del Betis y
  otro del Sevilla, sin escudos) en pose de correr. Colores planos.
- Formato y tamaño deseados: GLB, Y arriba.

## Semáforo
- Dónde se usa: `src/mundo/semaforos.ts` (cruces con `traffic_signals` de OSM).
- Placeholder actual: poste gris con brazo y una caja de 0,5 × 1 m que cambia de color entera.
- Descripción para generarlo: semáforo urbano español de tres luces con visera, low-poly
  (~150 triángulos), con las tres luces como materiales separados para encenderlas desde código.
- Formato y tamaño deseados: GLB, 3,4 m de alto, Y arriba.

## Bolsa de encargo
- Dónde se usa: `src/mundo/encargos.ts` (puerta de los locales con recado).
- Placeholder actual: caja marrón con asa de toro, girando y flotando sobre un anillo naranja.
- Descripción para generarlo: bolsa de papel de bar/farmacia con asas, low-poly (~100
  triángulos), color kraft, exagerada de tamaño (1,3 m) para leerse desde arriba.
- Formato y tamaño deseados: GLB, Y arriba.
