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
