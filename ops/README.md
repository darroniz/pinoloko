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
- **`TimeoutStartSec=4h50m` y arranque a las 00:15:** la cuota del plan va en **ventanas
  rodantes de 5 horas** que empiezan con la primera petición, no a una hora fija del reloj. Una
  sesión más larga que eso abre una segunda ventana que se solapa con la mañana y deja a Ismael
  la cuota mordida. Por eso la noche entera (00:15 → 05:05) cabe dentro de una sola ventana, y a
  las 09:00 esa ventana ya ha expirado: mañana limpia.
- **Freno semanal, con dos varas de medir.** Los cupos de 7 días se acumulan noche a noche y solo
  se reinician **los martes a las 12:00 (Europe/Madrid)** (comprobado el 07-sep-2026). Hay dos
  tipos y no valen lo mismo:
  - el **compartido** (`seven_day`, "all models") es del que también tira Ismael cuando trabaja,
    así que se protege: `PINOLOKO_TOPE_COMPARTIDO`, 60% por defecto;
  - el **propio del modelo** de la sesión nocturna no se lo quita a nadie —Ismael trabaja en
    Opus— así que se apura casi entero: `PINOLOKO_TOPE_PROPIO`, 92%.

  `noche.sh` lee los dos del cache de la CLI y no arranca si cualquiera pasa su tope. Es un freno
  grueso: la cifra es de la última lectura, no de ese instante. En vivo, `/usage`.
- **Ojo con el día de la semana.** Como el cupo se reinicia el martes al mediodía, las noches de
  domingo y lunes son las que más cerca están del corte: si alguna semana el freno salta, será
  ahí. Las noches de martes a jueves van sobradas.
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
