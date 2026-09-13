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

## Bici del Sevici con ciclista
- Dónde se usa: `src/mundo/sevici.ts` (carriles bici).
- Placeholder actual: dos ruedas, cuadro verde, cesta gris y ciclista de cápsula amarilla.
- Descripción para generarlo: bicicleta de la bici pública de Sevilla (cuadro bajo, cesta
  delantera, guardabarros), low-poly (~300 triángulos), con ciclista casual encima en pose de
  pedalear. Colores planos.
- Formato y tamaño deseados: GLB, Y arriba, -Z hacia delante, 1,8 m de largo.

## Helicóptero de la Policía Local
- Dónde se usa: `src/policia/helicoptero.ts` (a cinco estrellas).
- Placeholder actual: esfera blanca con franja azul, cola de caja y rotor como disco translúcido.
- Descripción para generarlo: helicóptero ligero de policía low-poly (~500 triángulos), blanco
  con franja azul, visto sobre todo desde arriba (que el rotor y el techo se lean).
- Formato y tamaño deseados: GLB, Y arriba, -Z hacia delante, 10 m de largo.

## Puesto de mercadillo
- Dónde se usa: `src/mundo/trastos.ts` (tipo `puesto`, junto al Mercado).
- Placeholder actual: tablero con tres cajas de género, dos postes y toldo a rayas.
- Descripción para generarlo: puesto de mercadillo con toldo a rayas rojas y blancas (y variantes
  azul y verde), ropa colgada y género en la mesa, low-poly (~250 triángulos).
- Formato y tamaño deseados: GLB, 2 m de ancho, Y arriba.

## Furgoneta de reparto
- Dónde se usa: `src/fisica/coche.ts` (`geometriaFurgoneta`), tráfico y robo.
- Placeholder actual: cajas apiladas (bajos, caja alta y cabina) con ruedas.
- Descripción para generarlo: furgoneta tipo Berlingo/Kangoo low-poly (~400 triángulos), blanca,
  proporciones de juguete.
- Formato y tamaño deseados: GLB, Y arriba, -Z hacia delante, 3,9 m de largo.

## Perro callejero
- Dónde se usa: `src/mundo/perros.ts` (pasajes).
- Placeholder actual: cajas (cuerpo, cabeza, orejas, patas y rabo) en tres pelajes.
- Descripción para generarlo: perro mediano de barrio (mezcla de podenco y lo que sea), low-poly
  (~200 triángulos), con pose de correr; tres pelajes: canela, negro y blanco.
- Formato y tamaño deseados: GLB, Y arriba, -Z hacia delante, 0,9 m de largo.

## Farola
- Dónde se usa: `src/mundo/farolas.ts`.
- Placeholder actual: poste con brazo y caja de luz.
- Descripción para generarlo: farola urbana sevillana de brazo (las de fundición negras del
  centro para la Alameda y Triana; una de poste gris para Pino Montano), low-poly (~120 tris).
- Formato y tamaño deseados: GLB, 6 m, Y arriba.

## Camión de Lipasam
- Dónde se usa: `src/fisica/coche.ts` (`geometriaCamion`), tráfico y robo.
- Placeholder actual: cabina blanca y caja verde de cajas, seis ruedas, luz naranja encima.
- Descripción para generarlo: camión de recogida de basura de carga trasera, low-poly (~500
  triángulos), verde Lipasam con cabina blanca, proporciones de juguete.
- Formato y tamaño deseados: GLB, Y arriba, -Z hacia delante, 7,5 m de largo.

## Cani en scooter (motos callejeras)
- Dónde se usa: `src/mundo/motosCalle.ts`.
- Placeholder actual: cajas de scooter del color del modelo con un cani de cápsula y gorra.
- Descripción para generarlo: puede reutilizar el GLB de la scooter del jugador con un piloto
  distinto (chándal de otro color, gorra); low-poly, mismas proporciones.
- Formato y tamaño deseados: GLB, Y arriba, -Z hacia delante, 1,7 m.

## Taxi de Sevilla
- Dónde se usa: `src/fisica/coche.ts` (`geometriaTaxi`), tráfico y minijuego del taxista.
- Placeholder actual: el utilitario de cajas en blanco con dos cajas amarillas en las puertas
  delanteras y el cartel del techo (caja blanca con luz verde).
- Descripción para generarlo: taxi de Sevilla low-poly (~400 triángulos): utilitario blanco,
  franja amarilla diagonal en las puertas delanteras, cartel luminoso "TAXI" en el techo con luz
  verde de libre. Proporciones de juguete.
- Formato y tamaño deseados: GLB, Y arriba, -Z hacia delante, 3,9 m de largo.

## Cliente del taxi
- Dónde se usa: `src/mundo/clientes.ts`.
- Placeholder actual: cápsula con cabeza y un brazo levantado que saluda, anillo amarillo en el suelo.
- Descripción para generarlo: puede ser el mismo vecino de la tribu con una animación de brazo
  levantado (o pose fija). Low-poly.
- Formato y tamaño deseados: GLB, Y arriba, 1,7 m.

## Camión de bomberos y ambulancia del 061
- Dónde se usa: `src/mundo/emergencias.ts` (`geometriaEmergencia`).
- Placeholder actual: cajas rojas con una escalera gris encima (bomberos); furgoneta blanca con
  franja amarilla y cruces rojas (ambulancia); luz azul parpadeante de caja.
- Descripción para generarlo: camión de bomberos rojo con escalera plegada, low-poly (~500
  triángulos), 7,5 m; ambulancia tipo furgón blanca con franja amarilla, cruz roja y luces azules,
  4,6 m. Proporciones de juguete, sin texto legible.
- Formato y tamaño deseados: GLB, Y arriba, -Z hacia delante.

## La vecina del quinto
- Dónde se usa: `src/mundo/vecina.ts`.
- Placeholder actual: cápsula rosa (bata), cabeza, moño gris y un brazo que lanza; maceta de cilindro.
- Descripción para generarlo: señora mayor en bata rosa y moño, con una maceta en la mano
  levantada, vista desde arriba; low-poly (~300 triángulos). Muy exagerada y cariñosa.
- Formato y tamaño deseados: GLB, Y arriba, 1,7 m; maceta aparte (0,4 m).

## Cartel de chapa y pintura
- Dónde se usa: `src/mundo/chapa.ts`.
- Placeholder actual: poste con un plano de canvas "CHAPA Y PINTURA", una lata de spray gigante y
  un anillo azul en el suelo.
- Descripción para generarlo: rótulo de taller de barrio (chapa, pintura, neumáticos), poste con
  cartel azul y blanco, y una lata de spray de juguete de 1,3 m. Low-poly.
- Formato y tamaño deseados: GLB, Y arriba, cartel a 4 m de altura.

## El camión del butano
- Dónde se usa: tráfico de todos los barrios (`geometriaButano` en `src/fisica/coche.ts`), robable.
- Placeholder actual: cabina naranja, caja abierta con 16 cilindros naranjas en dos filas.
- Descripción para generarlo: camión pequeño de reparto de bombonas, naranja butano, low-poly
  (~800 triángulos), con las bombonas naranjas apiladas de pie en la caja y la lona recogida.
- Formato y tamaño deseados: GLB, Y arriba, -Z delante, 7,5 m de largo.

## La furgoneta del chatarrero (y la voz del megáfono)
- Dónde se usa: tráfico, robable; megáfono sintetizado en `AudioJuego.megafono`.
- Placeholder actual: furgoneta blanca vieja con un colchón a rayas, un somier y una lavadora en la baca.
- Descripción para generarlo: furgoneta tipo C15 con la baca cargada de trastos atados con cuerda,
  bocina de megáfono en el techo. Y un audio (WAV mono, 4 s) de la voz del chatarrero por megáfono:
  "Se compran colchones, somieres, chatarra, cocinas, frigoríficos", con eco de calle.
- Formato y tamaño deseados: GLB de 3,9 m; audio WAV 22 kHz.

## El chiflo del afilador
- Dónde se usa: ambiente de los pasajes de día (`AudioJuego.chiflo`).
- Placeholder actual: escala de triángulo subiendo y bajando.
- Descripción para generarlo: la escala del chiflo (flauta de pan del afilador) grabada, 2 s, con
  un poco de reverberación de patio.
- Formato y tamaño deseados: WAV 22 kHz mono.

## El camarero con la escoba y el motero desplumado
- Dónde se usa: `src/mundo/perseguidores.ts`.
- Placeholder actual: cápsula blanca con delantal negro y escoba de palo con cepillo; cani con
  gorra y chándal azul.
- Descripción para generarlo: camarero de bar de barrio (camisa blanca, delantal negro largo,
  escoba en alto), y cani sin moto (chándal, gorra), ambos low-poly y con la misma escala que
  Wifly. Animación de correr si el formato lo permite.
- Formato y tamaño deseados: GLB, 1,7 m de alto.

## Columpio, tobogán y bombona
- Dónde se usa: trastos de los parques infantiles y del butanero (`src/mundo/trastos.ts`).
- Placeholder actual: columpio de tubo azul con asientos rojos, tobogán con escalera y rampa
  roja, bombona naranja con aro.
- Descripción para generarlo: mobiliario de parque infantil municipal (colores primarios,
  desgastado) y bombona de butano naranja de 12,5 kg.
- Formato y tamaño deseados: GLB; columpio 2,4 m de ancho, tobogán 2,6 m de largo, bombona 0,75 m.

## Litrona, altavoz del botellón y voces de la afición
- Dónde se usa: el botellón (`src/mundo/botellon.ts`, trasto `litrona`) y la afición del estadio.
- Placeholder actual: botella verde con etiqueta blanca; reggaetón y cánticos sintetizados.
- Descripción para generarlo: botella de litro de cerveza low-poly; un loop de reggaetón de 8 s
  libre de derechos (95 bpm) con sonido de altavoz bluetooth; y un loop de 10 s de afición a la
  puerta de un estadio (rumor, palmas, un cántico).
- Formato y tamaño deseados: GLB de 0,3 m; WAV 22 kHz mono.

## El Sevici de Wifly
- Dónde se usa: la bici que se le quita a un ciclista (`SEVICI` en `src/fisica/scooter.ts`).
- Placeholder actual: cuadro verde de cajas, cesta gris y ruedas grandes.
- Descripción para generarlo: bici de alquiler Sevici (cuadro gris verdoso, cesta delantera con
  el anillo rojo, guardabarros), low-poly, 1,8 m, con hueco para el piloto.
- Formato y tamaño deseados: GLB, Y arriba, -Z delante.

## Las palomas
- Dónde se usa: bandadas en las plazas y delante del Mercado (`src/mundo/palomas.ts`).
- Placeholder actual: cuerpo ovalado, cabeza, alas planas y cola, en cuatro grises, a escala 1,6.
- Descripción para generarlo: paloma urbana low-poly (gris azulado, cuello tornasolado) en dos
  poses: posada y con las alas abiertas; y un aleteo corto de bandada (1 s) más un arrullo.
- Formato y tamaño deseados: GLB de 0,5 m de envergadura; WAV 22 kHz mono.

## La cofradía
- Dónde se usa: la procesión de las tardes de salida (`src/mundo/procesion.ts`).
- Placeholder actual: nazarenos (cápsula morada con cono de capirote y cirio), músicos de azul
  marino con gorra de plato y tambor, cruz de guía de madera y un paso de palio de cajas (canastilla
  caoba, respiradero dorado, ocho cirios, imagen, varales y techo verde con bambalinas).
- Descripción para generarlo: nazareno de Sevilla low-poly (túnica y antifaz morado, cirio),
  músico de banda de cornetas y tambores, y un paso de palio (canastilla dorada, candelería,
  palio verde con bambalinas) de 2,2 × 4,5 m visto desde arriba. Y una marcha de palio de 20 s
  (cornetas y tambores) libre de derechos.
- Formato y tamaño deseados: GLB, Y arriba, -Z delante; WAV 22 kHz mono.

## La lluvia
- Dónde se usa: los días de lluvia (`src/efectos/lluvia.ts`, `src/mundo/charcos.ts`).
- Placeholder actual: rayitas claras que caen, charcos como elipses gris azulado, paraguas cónico
  azul, ruido de lluvia filtrado y un "chof" de ruido grave.
- Descripción para generarlo: loop de lluvia sobre asfalto de 8 s, un salpicón de charco, y un
  paraguas low-poly de 1,1 m (dos o tres colores).
- Formato y tamaño deseados: WAV 22 kHz mono; GLB.

## La minimoto
- Dónde se usa: la pocket bike de cani (`Minimoto` en `MODELOS`, `src/fisica/scooter.ts`).
- Placeholder actual: la scooter de cajas a escala 0,62 con Wifly encima a tamaño normal.
- Descripción para generarlo: minimoto de los 2000 (pocket bike de 49 cc, carenado naranja y
  negro, ruedas minúsculas), low-poly, 0,9 m de larga, con hueco para un piloto que le sobra por
  todos lados.
- Formato y tamaño deseados: GLB, Y arriba, -Z delante.
