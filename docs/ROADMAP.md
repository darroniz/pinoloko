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
- [x] ~~Semáforos~~: no hay ninguno en la caja del Mercado (OSM). Pasos de cebra pintados.
- [x] Peatones con máquina de estados (pasear, huir, caerse, insultar en sevillano, sentados en las terrazas).
- [x] El 13 de Tussam circulando por las calles rodadas, parando en las paradas, y robable.
- [x] Semáforos de OSM (cruces con ciclo) que paran el tráfico; saltárselos en rojo calienta.
- [x] Furgonetas de reparto y el camión de Lipasam en el tráfico (robables).
- [x] Sevici por los carriles bici, perros callejeros que persiguen la moto, abuelas con carrito.
- [x] Los bancos de OSM con vecinos sentados y pitido de combo que sube con la racha.
- [x] Tribus por barrio: canis, modernos, trianeros y pijos (pinta y gritos distintos).
- [x] Alarmas de los coches aparcados al golpearlos (intermitentes, dos tonos, vecinos corriendo, calor).
- [x] Farolas de noche, campanas de la parroquia, pájaros, grillos y bullicio de bar.
- [x] Ciclo día/noche (10 minutos por día, sol que gira, hora en el HUD).
- [x] Faros de los vehículos de noche.
- [x] Ventanas encendidas de noche (fachadas que miran a la cámara, encendidas al azar).

## 3. Cafre
- [x] Objetos derribables: conos, macetas, contenedores, papeleras, vallas, terrazas de bar, cajas del mercado.
- [x] Objetos que se rompen de verdad: macetas en cascos, cajas con la fruta por el aire, sillas y mesas a golpe fuerte (sin cristales: no hay nada de cristal derribable).
- [x] Daño y destrucción de vehículos (humo por debajo de 30, reventón a 0).
- [x] Dinero por destrozos y racha de "lío armado" con multiplicador.
- [x] Mercadillo junto al Mercado: puestos con toldo que se rompen.
- [x] Repetición corta con cámara baja al reventar un vehículo; vibración táctil en los golpes.

## 4. Policía local
- [x] Nivel de búsqueda por estrellas (calor que sube con fechorías y baja fuera de la vista).
- [x] Coches patrulla que persiguen por el grafo y a tiro en línea recta.
- [x] Controles policiales: a dos estrellas, un coche cruzado con conos por delante que arranca al verte.
- [x] Asimetría del barrio: la patrulla no entra en los pasajes; a partir de tres estrellas,
      motos de la Local que sí.
- [x] Escapar bajando el nivel; "¡Trincao!" y reaparición en el Mercado (no hay comisaría en la caja).
- [x] Helicóptero a cinco estrellas con foco que te sigue con retraso (se le escapa a fondo).
- [x] La Local a pie: a partir de dos estrellas, agentes que te persiguen andando por los pasajes.

## 5. El 13
- [x] Parada de bus (las `bus_stop` de OSM) y cinemática del viaje con cámara baja.
- [x] La Alameda como segundo barrio (caja de 500 m alrededor de la Alameda de Hércules).
- [x] Sistema de zonas documentado en `docs/COMO_ANADIR_UN_BARRIO.md` (perfiles en el generador).
- [x] Triana como tercer barrio; cada parada del 13 lleva a un destino distinto.
- [x] El Guadalquivir en Triana como zona de agua (recortada a la caja); caer dentro te devuelve a la parada.
- [x] Los Remedios (cuarto barrio) y Nervión (quinto, con el Sánchez-Pizjuán): territorio pijo, con
      Vespas y coches de pijo aparcados.
- [x] El Centro (sexto barrio) con la tribu de los guiris, Las Setas como setas y propinas de los guiris por las cafradas.
- [ ] Ampliar la caja del Mercado hacia fuera cuando Ismael diga que moverse ya es divertido.

## 6. Freestyle completo
- [x] "Recoge los 20 mecheros" (repartidos por pasajes, mercado y bares; se guardan).
- [x] Carreras por los pasajes contra el reloj (dos por barrio, récords) y rampas para saltar (dinero por vuelo).
- [x] Garaje de motos (las robadas se quedan; eliges con cuál sales) y estadísticas acumuladas.
- [x] Menú (portada y ESC / ☰ en partida, con pausa), créditos con atribución a OpenStreetMap, nueva partida.
- [x] Rótulos con el `name` real de bares y comercios (atlas de canvas, sobre la azotea del local).
- [x] Recadero: encargos entre locales con nombre real contra el reloj, encadenados.
- [x] Pachangas: balón de física con niños en campitos y pasajes; gol = dinero.
- [x] Logros (pestaña del menú) y pestaña MAPA del barrio (sin chivar los mecheros).
- [x] El taller: mejoras por moto (tubarro, variador, neumáticos, frenos) para gastar el dinero.
- [x] Motos callejeras por calles y pasajes, robables en marcha a pie.
- [x] Pistas la primera vez que pasa cada cosa (sin tutorial).
- [x] Piques: en cada carrera corren contigo el Kevin, el Jonathan y la Vanessa; puesto en el HUD y 60 € por ganarles.
- [x] Pintadas: seis botes de spray por barrio; a pie y con E, Wifly firma en el suelo (se guardan; en el MAPA).
- [x] Patada a pie (FRENO a pie = patada a trastos y balones) para que Wifly también pueda liarla sin moto.
- [x] Radares en las avenidas: foto multa a más de 50 (flash, -50 €, calor).

## 7. Pulido
- [ ] Rendimiento en móvil de gama media (falta la prueba real de Ismael; hay selector de
      calidad alta/media/baja en AYUDA y auditoría: 108-130 draw calls, 49-60k triángulos/frame).
- [x] Modo foto (P / 📷): captura con logo y hoja de compartir del móvil.
- [x] Dinero flotante donde lo ganas, como sprites en el WebGL (planos con textura de canvas, seis a la vez).
- [x] Caballito al acelerar; minimapa a la izquierda con el móvil apaisado.
- [x] Minimapa (norte arriba, paradas, patrullas, mecheros, siguiente punto de carrera; M o tocarlo para plegarlo).
- [x] Sonido sintetizado (motor de dos tiempos y de coche, derrape, golpes, sirena).
- [x] Manifest PWA, metadatos Open Graph y portada con JUGAR.
- [x] Service worker generado en el build (caché por versión, página red-primero, assets caché-primero).
