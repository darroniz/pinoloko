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
- [ ] **Bloque 2 (01:40-02:40)** — Scooter con Rapier: controles en plano de pantalla (teclado,
      joystick táctil, mando), inclinación en curva, derrape al frenar, rebote en choques.
      Cámara que sigue con retroceso a velocidad. Push: se conduce.
- [ ] **Bloque 3 (02:40-03:30)** — Vida en la azotea y en la calle: aires, depósitos,
      tendederos, parabólicas; árboles; conos y macetas que se llevan por delante; marcas de
      neumático; HUD con velocidad y nombre de calle; motor sintetizado. Push.
- [ ] **Bloque 4 (03:30-04:15)** — Tests Vitest del grafo y del cargador, ajuste de sensación
      arcade, guardado en localStorage, créditos con atribución OSM, metadatos móvil. Push.
- [ ] **Bloque 5 (04:15-04:45)** — Cierre: roadmap, decisiones, estas notas, verificación final.
