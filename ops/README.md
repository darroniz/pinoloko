# ops — cómo corre esto en paretopi

La sesión nocturna vive en la Raspberry Pi `paretopi`, como usuario `idarroniz`,
en `/home/idarroniz/pinoloko`.

## Instalación de las unidades

```bash
sudo cp ops/pinoloko.service ops/pinoloko.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pinoloko.timer
```

## Operativa

```bash
systemctl list-timers pinoloko.timer     # cuándo toca la próxima
sudo systemctl start pinoloko.service    # lanzar una sesión ya, a mano
journalctl -u pinoloko.service -f        # seguirla en vivo
tail -f ~/pinoloko/logs/$(date +%F).log  # el log de la sesión
sudo systemctl disable --now pinoloko.timer   # apagar las noches
```

## Por qué está así

- **Timer y no cron:** permite `Nice`, `IOSchedulingClass=idle` y techo de memoria, para que la
  sesión no compita con Immich ni con el stack de Velltec, que viven en la misma Pi.
- **`TimeoutStartSec=5h`:** si una sesión se cuelga, systemd la mata; no se queda dando vueltas.
- **`Persistent=false`:** si la Pi estaba apagada a las 00:30, no se dispara una sesión al
  encenderla a media mañana.
- **Chromium del sistema:** Playwright no publica binarios para linux-arm64.

## Requisitos ya instalados en la Pi

- Node 22 (NodeSource), Chromium de Debian, git, Python 3.11.
- Clave de despliegue `~/.ssh/id_pinovice` dada de alta como *deploy key* con escritura en el
  repo, y `~/.ssh/config` apuntando `github.com` a esa clave.
- Claude Code (`~/.local/bin/claude`) con la sesión Max ya autenticada.
