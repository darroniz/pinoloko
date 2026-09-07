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
- [x] Ciclo día/noche (10 minutos por día, sol que gira, hora en el HUD).
- [ ] Faros de los vehículos y ventanas encendidas de noche.

## 3. Cafre
- [x] Objetos derribables: conos, macetas, contenedores, papeleras, vallas, terrazas de bar, cajas del mercado.
- [ ] Objetos que se rompen de verdad (macetas en trozos, cristales) en vez de solo volcar.
- [ ] Daño y destrucción de vehículos.
- [x] Dinero por destrozos y racha de "lío armado" con multiplicador.

## 4. Policía local
- [x] Nivel de búsqueda por estrellas (calor que sube con fechorías y baja fuera de la vista).
- [x] Coches patrulla que persiguen por el grafo y a tiro en línea recta.
- [ ] Controles policiales (patrulla parada cortando una calle).
- [x] Asimetría del barrio: la patrulla no entra en los pasajes; a partir de tres estrellas,
      motos de la Local que sí.
- [x] Escapar bajando el nivel; "¡Trincao!" y reaparición en el Mercado (no hay comisaría en la caja).

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
- [x] Sonido sintetizado (motor de dos tiempos y de coche, derrape, golpes, sirena).
- [x] Manifest PWA, metadatos Open Graph y portada con JUGAR.
- [ ] Service worker para jugar sin conexión.
