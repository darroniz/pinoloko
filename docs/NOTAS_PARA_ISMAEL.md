# Notas para Ismael

Un párrafo por sesión nocturna, el más reciente arriba. Corto, para leer en el móvil.

---

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
- [ ] **Bloque 6** — Ciclo día/noche, más sensación arcade, cierre y notas.
