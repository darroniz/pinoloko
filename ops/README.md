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
- **`TimeoutStartSec=6h30m`:** la sesión trabaja unas 6 h (00:30 a ~06:40, el plan lo lleva ella
  mirando el reloj); el corte de systemd va algo más allá como red de seguridad, para que una
  sesión colgada no se coma la mañana.
- **Modelo:** Fable 5.1 (`claude-fable-5-1`), fijado en `PINOLOKO_MODEL` en la unidad.
- **`Persistent=false`:** si la Pi estaba apagada a las 00:30, no se dispara una sesión al
  encenderla a media mañana.
- **Chromium del sistema:** Playwright no publica binarios para linux-arm64.

## Requisitos ya instalados en la Pi

- Node 22 (NodeSource), Chromium de Debian, git, Python 3.11.
- Claude Code **2.1.263 o superior**: Fable 5.1 no existe antes de la 2.1.251. Si un día la
  sesión muere con `400 ... does not support this model`, es esto: `~/.local/bin/claude update`.
- Clave de despliegue `~/.ssh/id_pinovice` dada de alta como *deploy key* con escritura en el
  repo, y `~/.ssh/config` apuntando `github.com` a esa clave.
- Claude Code (`~/.local/bin/claude`) con la sesión Max ya autenticada.
