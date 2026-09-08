# Notas para Ismael

Un párrafo por sesión nocturna, el más reciente arriba. Corto, para leer en el móvil.

---

## Plan de la noche del 2026-09-09 (segunda sesión, 00:15 → 04:45)

Objetivo: **hito 5 entero (El 13 y la Alameda)** y comerme cuanto pueda del 6.
Lo primero, un bug gordo: el commit de la noche anterior que metió el día y la noche
borró sin querer el trozo que atendía a la tecla E / botón SUBIR-BAJAR (y la R nunca llegó
a cablearse). En lo publicado ahora mismo Wifly no puede bajarse de la moto.

- [x] **Bloque 1 (hecho a las 00:35)** — Arreglar E y R. Refactor: cada barrio es un objeto
      `Barrio` (escena + física + población) que se destruye y recrea. Paradas del 13 en las
      `bus_stop` de OSM, cinemática del bus con cámara baja, viaje a la Alameda y vuelta,
      barrio guardado en la partida, mecheros por barrio. Tests del registro de barrios y de
      las paradas. Verificación con viaje incluido. Push.
- [x] **Bloque 2 (hecho a las 00:45)** — La Alameda con su propia paleta (casco antiguo: albero,
      blanco y cal), afinar población y rendimiento con 891 edificios.
      `docs/COMO_ANADIR_UN_BARRIO.md`. Push.
- [x] **Bloque 3 (hecho a la 01:00)** — Hito 6: menú principal con créditos (OSM), estadísticas
      de la partida y garaje (motos que has robado, elegir con cuál sales). Push.
- [x] **Bloque 4 (hecho a la 01:15)** — Rótulos con el `name` real de bares y comercios sobre
      las puertas, ventanas encendidas de noche, controles policiales. Push.
- [x] **Bloque 5 (hecho a la 01:40)** — Carreras por los pasajes contra el reloj (checkpoints)
      y rampas para saltar. Push.
- [ ] **Cierre (04:25-04:45)** — roadmap, decisiones, notas, verificación final y push.

## Plan de la noche del 2026-09-08 (primera sesión, 00:15 → 04:45)

Objetivo: **hito 1 entero** (Moverse) publicado y jugable en el móvil.

- [x] **Bloque 0 (00:20-00:50)** — Esqueleto: Vite + TS estricto + Three.js + Rapier, ESLint,
      Vitest, script de verificación con Playwright (Chromium del sistema, 390x844).
- [x] **Bloque 1 (00:50-01:40)** — Pipeline `tools/` en Python (stdlib, sin numpy): descarga
      Overpass cacheada, nivel del Mercado en JSON local (edificios con altura y color por tipo,
      calles rodadas y pasajes, POIs con nombre, grafo de waypoints). Cargador en Three.js con
      cámara alta en perspectiva. Primer push: se ve el barrio.
- [x] **Bloque 2 (01:40-02:40, hecho a la 01:05)** — Scooter con Rapier: controles en plano de pantalla (teclado,
      joystick táctil, mando), inclinación en curva, derrape al frenar, rebote en choques.
      Cámara que sigue con retroceso a velocidad. Push: se conduce.
- [x] **Bloque 3 (hecho a la 01:15, iba dentro del 1 y el 2)** — Azoteas con trastos, árboles,
      conos y macetas, marcas, HUD, motor. Y de propina del hito 2: Wifly a pie, subir y bajar,
      robar motos aparcadas y 110 vecinos que pasean, huyen e insultan.
- [x] **Bloque 4 (hecho a la 01:35)** — Tráfico de coches por las calles rodadas, coches
      aparcados y robo en marcha; tests del grafo, geometría, vecinos y tráfico.
- [x] **Bloque 5 (hecho a la 01:50)** — Policía Local: estrellas, patrullas en coche y en moto,
      sirena, ¡Trincao! y vuelta al Mercado. Manifest PWA.
- [x] **Bloque 6 (hecho a las 02:00)** — Ciclo día/noche con hora en el HUD, tecla R para
      volver al Mercado, tráfico y patrullas dinámicos (arreglado el coche a 2.208 km/h),
      paso de física variable.
- [x] **Bloque 7 (hecho a las 02:10)** — Los 20 mecheros, faros de noche, pasos de cebra,
      trincado arreglado con patrullas dinámicas.
- [x] **Bloque 8 (hecho a las 02:15)** — Daño y reventón de vehículos, claxon que asusta.
- [x] **Bloque 9 (hecho a las 02:20)** — Pantalla completa en móvil, sombras más baratas,
      cámara según vehículo, daño más blando.
- [ ] **Cierre** — notas finales, roadmap, verificación y push.
