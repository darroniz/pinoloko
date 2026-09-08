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
edificios (110 KB); la Alameda, 891 (275 KB) y tarda unos 7 s en construirse en una Pi sin GPU.
Más de 1.000 edificios y habría que pasar a GLB precompilado.

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
  destino13: 'alameda',                 // a dónde lleva el 13 desde aquí
  poblacion: { vecinos: 140, trafico: 12, motos: 16, coches: 10 },
  bienvenida: 'Triana. La otra orilla.',
  paradaLlegada: 'Plaza de Cuba',       // trozo del nombre de la bus_stop donde te deja el bus
},
```

- `paradaLlegada` se busca por trozo del nombre entre las paradas del nivel (sin distinguir
  mayúsculas). Si no casa, se usa la parada más cercana al centro. Ahí reapareces también al
  trincarte y con la tecla R.
- `destino13` de momento es un único destino por barrio (el 13 va y vuelve). Si algún día hay
  varios, la ficha crece a una lista y la parada decide.
- Ajusta `poblacion` a ojo: la Alameda lleva más vecinos y menos tráfico que Pino Montano porque
  es peatonal.

Recuerda enlazar el barrio desde otro: el `destino13` de alguien tiene que apuntar a él.

## 4. Comprobar

```bash
npm run lint && npm run test && npm run build && npm run verificar
```

- `tests/barrios.test.ts` comprueba cada ficha: que el destino existe, que el nivel está
  generado, que hay paradas y que la de llegada existe y tiene una calle rodada a menos de 40 m.
- `npm run verificar` hace un viaje de ida y vuelta en el 13 desde el barrio inicial.
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
- Pasos de cebra, paradas, POIs con `name` (bares, comercios) y zonas verdes.
