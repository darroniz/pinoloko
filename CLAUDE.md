# Pinoloko — contexto del repo

Juego de mundo abierto en navegador, Sevilla vista desde arriba, low-poly "cozy", modo freestyle.
Lo desarrolla una sesión autónoma cada noche en una Raspberry Pi.

**El brief completo y el protocolo de trabajo están en [`PROMPT.md`](PROMPT.md). Léelo entero
al empezar la sesión: manda sobre este fichero.**

## Lo mínimo que no puedes olvidar

- Publicar = `git push` a `main`. GitHub Pages construye y sirve en
  https://pinoloko.com/ — por eso `base: '/'` en Vite y `public/CNAME` con el dominio (no lo borres).
- El repo es **público**: aquí no entra ninguna credencial.
- Nunca se nombra a Rockstar ni a "GTA", ni marcas, negocios o personas reales.
- `docs/FEEDBACK.md` es de Ismael: se lee, no se toca.
- Corres en una Raspberry Pi 4 sin GPU: no reinstales `node_modules` por gusto, usa el Chromium
  del sistema y no midas FPS reales aquí (ver el paso 5 de `PROMPT.md`).
- ¿Duda? Decide, apunta en `docs/DECISIONES.md`, sigue. No preguntes.
