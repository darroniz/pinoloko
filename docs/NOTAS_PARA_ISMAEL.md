# Notas para Ismael

Un párrafo por sesión nocturna, el más reciente arriba. Corto, para leer en el móvil.

---

## Plan de la noche del 2026-09-10 (tercera sesión, 00:15 → 04:45)

Sin feedback nuevo en `FEEDBACK.md` y el roadmap con los siete hitos casi vacíos, así que la
noche va de **hacer el barrio más vivo y más cafre**, siempre dentro del modo freestyle, y de
dejar herramientas para que pruebes el rendimiento en el móvil.

- [x] **Bloque 1 (hecho a las 00:30)** — Semáforos de verdad desde OSM (`highway=traffic_signals`:
      19 en Triana, 4 en el Mercado): postes con ciclo rojo/verde, tráfico que para en rojo y
      saltárselo en rojo calienta a la Local. Tests del ciclo. Push.
- [x] **Bloque 2 (hecho a las 00:30, con el 1)** — Minijuego "Recadero": coger un encargo en un bar con nombre
      real y llevarlo a otro contra el reloj, en moto, con flecha en el minimapa. Por barrio,
      con dinero según lo rápido. Push.
- [x] **Bloque 3 (hecho a las 00:36)** — Canis contra pijos: vecinos con pinta y frases según el
      barrio (chándal en Pino Montano, polo y jersey a los hombros en Triana, la Alameda a su
      rollo) y pestaña de LOGROS en el menú. Push.
- [x] **Bloque 4 (hecho a las 00:45)** — El balón en el pasaje: niños jugando al fútbol con un balón
      de física que puedes chutar con la moto (gol = euros), vibración táctil en los golpes y
      repetición corta con cámara baja cuando revienta un vehículo. Push.
- [x] **Bloque 5 (hecho a las 00:50)** — Rendimiento móvil: auditoría de draw calls y triángulos por
      barrio, sombras y DPR por nivel de calidad elegible en el menú (se guarda), y lo que salga
      de la auditoría. Push.
- [x] **Bloque 6 (hecho a las 00:55)** — Modo foto (P o 📷: captura con logo y hoja de compartir).
- [x] **Bloque 7 (hecho a la 01:00)** — Sevici por el carril bici (timbre y caída) y campanas de la parroquia.
- [x] **Bloque 8 (hecho a la 01:08)** — Helicóptero de la Local a cinco estrellas (foco que te persigue; si vas rápido lo pierdes).
- [x] **Bloque 9 (hecho a la 01:12)** — Mercadillo junto al Mercado (diez puestos con toldo que se rompen) y furgonetas en el tráfico.
- [x] **Bloque 10 (hecho a la 01:12)** — Pistas la primera vez que pasa cada cosa.
- [x] **Bloque 11 (hecho a la 01:15)** — El taller: mejoras por moto para gastar el dinero.
- [x] **Bloque 12 (hecho a la 01:32)** — Farolas de noche, coches del tráfico que pitan si les cortas el paso, y perros por los pasajes.
- [x] **Bloque 14 (hecho a la 01:58)** — Pestaña MAPA, ambiente sonoro (pájaros, grillos, bullicio de bar), olés y guía de barrios al día.
- [x] **Bloque 16 (hecho a las 02:24)** — Ayuda y portada al día, icono de foto en SVG, sonda de caos (juego al azar sin errores), roadmap.
- [ ] **Bloque 17** — Claxon musical en el taller, zumbido de las motos que pasan y bocina grave del 13 y el camión.
- [x] **Bloque 15 (hecho a las 02:10)** — Motos callejeras: canis en scooter por calles y pasajes, se caen si los embistes y se roban en marcha a pie.
- [x] **Bloque 13 (hecho a la 01:48)** — Caballito al acelerar, abuelas con carrito, minimapa a la izquierda en apaisado y el camión de Lipasam en el tráfico.
- [ ] **Cierre (04:20-04:45)** — roadmap, decisiones, notas, verificación final y push.

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
- [x] **Bloque 6 (hecho a la 01:35)** — Roturas de verdad: macetas en cascos, cajas del mercado
      con la fruta por el aire, sillas y mesas de terraza que saltan en piezas. Push.
- [x] **Bloque 7 (hecho a la 01:32)** — Service worker: jugar sin conexión, actualización limpia
      al publicar. Push.
- [x] **Bloque 8 (hecho a la 01:48)** — El 13 circulando de verdad por las calles rodadas (y
      robable), vecinos sentados en las terrazas. Push.
- [x] **Bloque 9 (hecho a la 01:40)** — Cómo se juega, pitidos y fanfarria, assets pendientes.
- [x] **Bloque 10 (hecho a la 01:55)** — Triana como tercer barrio y paradas con destino propio.
- [x] **Bloque 11 (hecho a las 02:30)** — El Guadalquivir en Triana, minimapa (tres versiones hasta dar con la que no cuesta frames) y fuga de geometrías de las patrullas.
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
