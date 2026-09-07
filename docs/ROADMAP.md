# Roadmap

Orden de prioridad. Cada tarea debe caber en una sesión nocturna y dejar el juego jugable.
Marca `[x]` lo terminado y publicado; añade tareas nuevas donde corresponda.

## 0. Arranque
- [x] Proyecto Vite + TypeScript estricto + Three.js + Rapier, lint y tests configurados.
- [x] `CLAUDE.md` del repo con el brief resumido.
- [x] Script de verificación del paso 5 (servir `dist/`, Playwright headless, los tres checks).

## 1. Moverse
- [x] `tools/` en Python: descarga de OSM de la caja del Mercado
      (`37.42020,-5.96658,37.42470,-5.96092`), cacheada en el repo.
- [x] Extrusión de manzanas y edificios (nivel JSON + geometría en cliente; GLB si hace falta), con altura de `building:levels`.
- [x] Coloreado por tipo (`building`/`shop`/`amenity`) y tejados con `roof:shape`/`roof:colour`.
- [x] Detalle procedural de azotea: aires, depósitos, tendederos, parabólicas, macetas.
- [x] Grafo de waypoints generado por el mismo script, separando rodado de peatonal.
- [x] Scooter con Rapier: inclinación en curva, derrape del trasero al frenar, rebote exagerado.
- [x] Cámara alta en perspectiva (FOV estrecho, 55-60°, sin rotación), con retroceso leve a
      velocidad alta.
- [x] Controles: teclado, joystick táctil y mando, en el plano de pantalla.
- [x] Marcas de neumático y feedback de choque (sacudida, chispas, sonido).
- [ ] **Gate: moverse por el barrio tiene que ser divertido antes de pasar de aquí.**

## 2. Vida
- [x] Wifly a pie por los pasajes: bajarse y subirse a la moto (E / botón SUBIR-BAJAR), robar
      las motos aparcadas por el barrio (Jog RR, Zip SP, Sonic, Speedfight, Runner).
- [x] Coches aparcados y del tráfico que se pueden robar y conducir (más pesados, derrape largo).
- [x] Tráfico por el grafo rodado: circulan por su derecha, frenan en cruces y ante obstáculos.
- [ ] Semáforos en los cruces con `highway=traffic_signals` (los datos ya están en el nivel).
- [x] Peatones con máquina de estados (pasear, huir, caerse, insultar en sevillano).
- [ ] Ciclo día/noche.

## 3. Cafre
- [x] Objetos derribables: conos, macetas, contenedores, papeleras, vallas, terrazas de bar, cajas del mercado.
- [ ] Objetos que se rompen de verdad (macetas en trozos, cristales) en vez de solo volcar.
- [ ] Daño y destrucción de vehículos.
- [x] Dinero por destrozos y racha de "lío armado" con multiplicador.

## 4. Policía local
- [ ] Nivel de búsqueda por estrellas.
- [ ] Coches patrulla que persiguen; controles policiales.
- [ ] Asimetría del barrio: la patrulla no entra en los pasajes; a estrellas altas, algo que sí
      (patrulla en moto o a pie).
- [ ] Escapar bajando el nivel; "busted" y reaparición en comisaría.

## 5. El 13
- [ ] Parada de bus y cinemática del viaje.
- [ ] La Alameda como segundo barrio.
- [ ] Sistema de zonas documentado en `docs/COMO_ANADIR_UN_BARRIO.md`.

## 6. Freestyle completo
- [ ] Carreras por los pasajes, saltos con rampas, "recoge los 20 mecheros".
- [ ] Coleccionables, garaje de motos, estadísticas.
- [ ] Menú principal y pantalla de créditos (con atribución a OpenStreetMap).
- [ ] Comercios y bares del barrio con el `name` real de las etiquetas de OSM.

## 7. Pulido
- [ ] Rendimiento en móvil de gama media.
- [ ] Sonido sintetizado (motor, claxon, sirena).
- [ ] PWA instalable, metadatos para compartir, portada con "jugar ahora".
