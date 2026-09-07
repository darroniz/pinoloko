# Decisiones tomadas sin preguntar

Cada vez que una sesión nocturna se encuentre una duda, decide lo más razonable, lo apunta
aquí con fecha y sigue. Si Ismael no dice nada, la decisión queda firme.

---

## 2026-09-07 — Decisiones del montaje (antes de la primera sesión)

**Hosting: GitHub Pages en vez de Vercel.** El prompt original pedía Vercel con `VERCEL_TOKEN`.
No hay cuenta de Vercel ni dominio, y sí hay GitHub. Cada push a `main` dispara el workflow
`pages.yml`, que construye y publica. Ventaja: no hay ningún token de despliegue que custodiar
en la Pi; publicar es literalmente `git push`. URL: https://pinoloko.com/

**Repo público.** GitHub Pages solo publica desde repos privados con plan de pago. El juego va
a ser público igualmente, así que el repo es público. Consecuencia: aquí no entra ninguna clave.

**Dominio propio `pinoloko.com`.** Ismael lo compró el mismo día del montaje, así que el sitio
nace ya con dominio: `public/CNAME` contiene `pinoloko.com` y `vite.config.ts` va con `base: '/'`.
El fichero `CNAME` tiene que llegar a `dist/` en cada build (por eso vive en `public/`): si un
build lo pierde, GitHub Pages se olvida del dominio. Mientras el DNS propaga, Pages sigue
sirviendo en `darroniz.github.io/pinoloko-vice/`, y eso no debe hacer fallar la verificación.

**Máquina: `paretopi` (Raspberry Pi 4) y no un VPS aislado.** El prompt pedía máquina aislada
porque la sesión corre con `--dangerously-skip-permissions`. Se ha optado por reutilizar la Pi
que ya existe, como usuario `idarroniz`, asumiendo ese riesgo a cambio de no montar ni pagar un
VPS. Mitigación aplicada: la sesión arranca con `--strict-mcp-config` y sin ningún MCP, y su
directorio de trabajo es solo el repo.

**Node 22 vía NodeSource.** El `nodejs` de Debian Bookworm es el 18 y se queda corto para el
tooling actual de Vite/Vitest.

**Playwright usa el Chromium del sistema.** Playwright no publica binarios de Chromium para
linux-arm64, así que `npx playwright install chromium` no sirve en la Pi. Se usa
`executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium'`.

**El gate de "30 FPS" se sustituye.** En headless sobre la Pi no hay GPU: el WebGL va por
SwiftShader (software) y nunca llegaría a 30 FPS, así que ese gate revertiría todos los commits.
En su lugar el paso 5 comprueba: cero errores de consola, ≥120 frames renderizados en 10 s, y
mediana del `update()` de lógica por debajo de 8 ms. El rendimiento real en móvil lo valida
Ismael y lo cuenta en `FEEDBACK.md`.

**Lanzador: timer de systemd, no cron.** Permite limitar memoria y prioridad de CPU/disco para
no molestar a los otros servicios de la Pi, y deja los logs en el journal además del fichero.

**El dominio se ata en los ajustes del repo, no en el fichero `CNAME`.** Con despliegue por
workflow (`build_type: workflow`), GitHub Pages **ignora** el `CNAME` del artefacto: el dominio
vive en la configuración del repo (`PUT /repos/:owner/:repo/pages`, campo `cname`), ya fijado a
`pinoloko.com`. Se mantiene `public/CNAME` de todas formas como red de seguridad y como pista
para quien lea el repo. Si algún día el dominio "se cae" del sitio, el sitio a mirar es Settings
→ Pages, no el fichero.
