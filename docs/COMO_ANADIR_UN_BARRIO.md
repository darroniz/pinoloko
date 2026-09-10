# Cómo añadir un barrio

Cada barrio es un nivel independiente: una carpeta en `public/barrios/<id>/` con su `nivel.json`
(edificios, calles, grafo, POIs, paradas) y una ficha en `src/mundo/barrios.ts`. No hay streaming:
para cambiar de barrio Wifly coge el 13 de Tussam en una parada, y el juego destruye el barrio
actual (escena y mundo físico) y construye el otro. Añadir uno son cuatro pasos y ningún cambio
en el motor.

## 1. Elegir la caja

Un cuadrado de unos 500 x 500 m en `sur,oeste,norte,este` (grados decimales). Comprueba en
[openstreetmap.org](https://www.openstreetmap.org/) que dentro hay **al menos una parada de bus**
(`highway=bus_stop`): sin parada no se puede llegar ni salir. Lo ideal es que la parada de llegada
esté cerca del centro de la caja y junto a una calle rodada.

Orientación: la caja de 500 m cabe en un móvil sin que el cargador tarde. El Mercado son 186
edificios (110 KB); la Alameda, 891 (275 KB); Los Remedios, 818 (251 KB); Triana, 1.214 (418 KB)
y tarda unos 8 s en construirse en una Pi sin GPU. Mucho más y habría que pasar a GLB precompilado.

## 2. Añadir el perfil al generador

En `tools/genera_nivel.py`, una entrada en `PERFILES`:

```python
"triana": {
    "nombre": "Triana",
    "bbox": "37.38300,-6.00700,37.38750,-6.00130",
    "cache": "triana",                    # fichero en tools/cache-osm/
    "paleta": PALETA_CASCO,               # o PALETA_BLOQUES, o una nueva
    "plantas": {**PLANTAS_POR_DEFECTO, "yes": 3},   # cuando OSM no trae building:levels
    "alto_planta": 3.2,
},
```

Y generarlo:

```bash
python3 tools/genera_nivel.py triana
```

La primera vez descarga de Overpass y guarda la respuesta en `tools/cache-osm/triana.json`
(**se sube al repo**: las noches siguientes no dependen de la red). Las siguientes veces lee la
caché. El resultado va a `public/barrios/triana/nivel.json`. Solo stdlib de Python.

## 3. Dar de alta la ficha

En `src/mundo/barrios.ts`, dentro de `BARRIOS`:

```ts
triana: {
  id: 'triana',
  nombre: 'Triana',
  destinos13: ['alameda', 'pino-montano'], // a dónde lleva el 13 desde aquí (una parada por destino, por turnos)
  poblacion: { vecinos: 140, trafico: 12, buses: 1, motos: 16, coches: 10, sevici: 8, perros: 6, motosCalle: 8 },
  tribu: 'trianeros',                   // 'canis' | 'modernos' | 'trianeros': pinta y gritos de los vecinos
  bienvenida: 'Triana. La otra orilla.',
  paradaLlegada: 'Plaza de Cuba',       // trozo del nombre de la bus_stop donde te deja el bus
},
```

- `paradaLlegada` se busca por trozo del nombre entre las paradas del nivel (sin distinguir
  mayúsculas). Si no casa, se usa la parada más cercana al centro. Ahí reapareces también al
  trincarte y con la tecla R.
- `destinos13`: las paradas del barrio (ordenadas por nombre) se reparten los destinos por
  turnos: con dos destinos y tres paradas, la primera y la tercera van al primero. El aviso al
  acercarte a la parada dice a dónde va. Con un solo destino, todas van al mismo sitio.
- Ajusta `poblacion` a ojo: la Alameda lleva más vecinos y menos tráfico que Pino Montano porque
  es peatonal. `sevici` son ciclistas por los `cycleway` de la caja (si no hay, pon 0); `perros`,
  perros callejeros por los pasajes; `motosCalle`, canis en scooter por calles y pasajes (se
  roban en marcha); `buses`, cuántos 13 circulan. Siempre hay además un camión
  de Lipasam y una de cada cuatro entradas de tráfico es furgoneta.
- `tribu` decide la ropa y el gorro de los vecinos y qué te gritan (`TRIBUS` en
  `src/mundo/peatones.ts`): `canis` (gorra), `modernos` (gorro), `trianeros` (nada) y `pijos`
  (jersey a los hombros; Los Remedios y Nervión).

Recuerda enlazar el barrio desde otro: algún `destinos13` tiene que apuntar a él. El test
comprueba que desde cualquier barrio se llega a todos.

## 4. Comprobar

```bash
npm run lint && npm run test && npm run build && npm run verificar
```

- `tests/barrios.test.ts` comprueba cada ficha: que los destinos existen y se llega a todos,
  que el nivel está generado, que hay paradas y que la de llegada existe y tiene una calle rodada
  a menos de 40 m.
- `npm run verificar` visita todos los barrios en el 13 y vuelve al inicial; el último visitado
  es el que se mide (tiene que rendir al menos la mitad que el inicial).
- Para abrir directamente un barrio en el navegador: `?barrio=triana` en la URL.
- Para verlo en la Pi con cifras: `node scripts/sonda-barrio.mjs triana` (captura en `logs/`).

## Qué se guarda y qué no

- Se guarda con la partida: barrio actual, posición, dinero, hora. Los mecheros van por barrio
  (`pinoloko.mecheros.<id>.v1`; Pino Montano conserva la clave original).
- No sobrevive al viaje: motos y coches robados, nivel de búsqueda, trastos derribados. Cada
  barrio nace nuevo al llegar. Es a propósito: es lo que permite que no haya streaming.

## Lo que decide el generador solo

- Tipo y color del edificio por `building`, `shop`, `amenity` y `building:colour`; altura por
  `building:levels` o `height`, y si no, por el perfil.
- Calles rodadas vs. pasajes por `highway` (ver `VIAS_RODADAS` y `VIAS_PEATONALES`).
- Árboles: los `natural=tree` de OSM donde están; el resto se plantan procedimentalmente.
- Pasos de cebra, semáforos (`highway=traffic_signals` y `crossing=traffic_signals` sobre calle
  rodada, agrupados en cruces con ciclo propio), paradas, POIs con `name` (bares, comercios) y
  zonas verdes.
- Lo que el barrio coloca solo al construirse: dos carreras, seis rampas, veinte mecheros, tres
  bolsas de encargo en locales con nombre, hasta cuatro pachangas (campitos `pitch`/`playground`
  o pasajes anchos), el mercadillo junto al `marketplace` si lo hay, terrazas en los bares,
  farolas por las calles rodadas y semáforos donde OSM los tenga.
