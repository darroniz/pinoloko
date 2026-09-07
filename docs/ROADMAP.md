# Roadmap

Orden de prioridad. Cada tarea debe caber en una sesión nocturna y dejar el juego jugable.
Marca `[x]` lo terminado y publicado; añade tareas nuevas donde corresponda.

## 0. Arranque
- [ ] Proyecto Vite + TypeScript estricto + Three.js + Rapier, lint y tests configurados.
- [ ] `CLAUDE.md` del repo con el brief resumido.
- [ ] Script de verificación del paso 5 (servir `dist/`, Playwright headless, los tres checks).

## 1. Moverse
- [ ] `tools/` en Python: descarga de OSM de la caja del Mercado
      (`37.42020,-5.96658,37.42470,-5.96092`), cacheada en el repo.
- [ ] Extrusión de manzanas y edificios → GLB optimizado, con altura de `building:levels`.
- [ ] Coloreado por tipo (`building`/`shop`/`amenity`) y tejados con `roof:shape`/`roof:colour`.
- [ ] Detalle procedural de azotea: aires, depósitos, tendederos, parabólicas, macetas.
- [ ] Grafo de waypoints generado por el mismo script, separando rodado de peatonal.
- [ ] Scooter con Rapier: inclinación en curva, derrape del trasero al frenar, rebote exagerado.
- [ ] Cámara alta en perspectiva (FOV estrecho, 55-60°, sin rotación), con retroceso leve a
      velocidad alta.
- [ ] Controles: teclado, joystick táctil y mando, en el plano de pantalla.
- [ ] Marcas de neumático y feedback de choque.
- [ ] **Gate: moverse por el barrio tiene que ser divertido antes de pasar de aquí.**

## 2. Vida
- [ ] Wifly a pie por los pasajes: entrar y salir de vehículos, robar motos y coches parados
      y en marcha.
- [ ] Tráfico por el grafo rodado, con cruces y semáforos simples.
- [ ] Peatones con máquina de estados (pasear, huir, reaccionar, insultar en sevillano).
- [ ] Ciclo día/noche.

## 3. Cafre
- [ ] Objetos rompibles: conos, macetas, contenedores, terrazas de bar, puestos del mercado.
- [ ] Daño y destrucción de vehículos.
- [ ] Dinero por destrozos y marcador de "lío armado".

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
