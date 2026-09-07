# Roadmap

Orden de prioridad. Cada tarea debe caber en una sesión nocturna y dejar el juego jugable.
Marca `[x]` lo terminado y publicado; añade tareas nuevas donde corresponda.

## 0. Arranque
- [ ] Proyecto Vite + TypeScript estricto + Three.js + Rapier, lint y tests configurados.
- [ ] `CLAUDE.md` del repo con el brief resumido.
- [ ] Script de verificación del paso 5 (servir `dist/`, Playwright headless, los tres checks).

## 1. Conducir
- [ ] `tools/` en Python: descarga de OSM (Overpass) de un tramo de Pino Montano, cacheada en repo.
- [ ] Extrusión de manzanas y edificios → GLB optimizado.
- [ ] Grafo de waypoints de tráfico generado por el mismo script.
- [ ] Coche con Rapier (raycast vehicle), derrape marcado y rebote exagerado en colisión.
- [ ] Cámara ortográfica diagonal fija que sigue al coche, con zoom out leve a velocidad alta.
- [ ] Controles: teclado, joystick táctil y mando, en el plano de pantalla.
- [ ] Marcas de neumático y feedback de choque.
- [ ] **Gate: conducir tiene que ser divertido antes de pasar de aquí.**

## 2. Vida
- [ ] Tráfico por el grafo, con cruces y semáforos simples.
- [ ] Peatones con máquina de estados (pasear, huir, reaccionar, insultar en sevillano).
- [ ] Ciclo día/noche.
- [ ] Wifly a pie: entrar y salir de coches, robar parados y en marcha.

## 3. Cafre
- [ ] Objetos rompibles: conos, macetas, contenedores, terrazas de bar.
- [ ] Daño y destrucción de coches.
- [ ] Dinero por destrozos y marcador de "lío armado".

## 4. Policía local
- [ ] Nivel de búsqueda por estrellas.
- [ ] Coches patrulla que persiguen; controles policiales.
- [ ] Escapar bajando el nivel; "busted" y reaparición en comisaría.

## 5. El 13
- [ ] Parada de bus y cinemática del viaje.
- [ ] La Alameda como segundo barrio.
- [ ] Sistema de zonas documentado en `docs/COMO_ANADIR_UN_BARRIO.md`.

## 6. Freestyle completo
- [ ] Carreras callejeras, saltos con rampas, "recoge los 20 mecheros".
- [ ] Coleccionables, garaje, estadísticas.
- [ ] Menú principal y pantalla de créditos (con atribución a OpenStreetMap).

## 7. Pulido
- [ ] Rendimiento en móvil de gama media.
- [ ] Sonido sintetizado (motor, claxon, sirena).
- [ ] PWA instalable, metadatos para compartir, portada con "jugar ahora".
