#!/usr/bin/env bash
# Sesión nocturna autónoma de Pinoloko. Lo lanza el timer de systemd
# pinoloko.timer en paretopi. Ver ops/ para las unidades.
set -uo pipefail

REPO="${PINOLOKO_REPO:-$HOME/pinoloko}"
MAX_TURNS="${PINOLOKO_MAX_TURNS:-1500}"
MODEL="${PINOLOKO_MODEL:-claude-fable-5-1}"
# Dos topes, porque no todos los cupos semanales son iguales:
#  - COMPARTIDO: el cupo "all models", que es el mismo del que tira Ismael cuando
#    trabaja (él va en Opus). Aquí mano dura: lo suyo va primero.
#  - PROPIO: el cupo semanal del modelo de la sesión nocturna. Ese no se lo quita
#    a nadie, así que se puede apurar casi entero.
TOPE_COMPARTIDO="${PINOLOKO_TOPE_COMPARTIDO:-60}"
TOPE_PROPIO="${PINOLOKO_TOPE_PROPIO:-92}"
# systemd y las sesiones no interactivas no traen ~/.local/bin en el PATH.
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.local/bin/claude}"
LOGDIR="$REPO/logs"

# Lee el consumo que dejó cacheado la última sesión. Solo sirve de freno grueso:
# la cifra es de la última vez que la CLI la refrescó, no de ahora mismo.
# Imprime dos números: el cupo semanal COMPARTIDO ("all models") y el más alto de
# los cupos semanales propios de un modelo. Se miran por separado porque solo el
# primero le resta a Ismael.
cupos_semanales() {
  python3 - <<'PYEOF' 2>/dev/null || echo " "
import json, os
compartido, propio = "", ""
try:
    u = json.load(open(os.path.expanduser("~/.claude.json")))["cachedUsageUtilization"]["utilization"]
    v = u.get("seven_day")
    if isinstance(v, dict) and v.get("utilization") is not None:
        compartido = v["utilization"]
    otros = [
        x["utilization"]
        for k, x in u.items()
        if k != "seven_day" and isinstance(x, dict) and x.get("utilization") is not None
        and (k.startswith("seven_day") or u.get("seven_day") is not None)
        and k not in ("extra_usage", "five_hour")
    ]
    if otros:
        propio = max(otros)
except Exception:
    pass
print(compartido, propio)
PYEOF
}

cd "$REPO" || { echo "No existe $REPO"; exit 1; }
mkdir -p "$LOGDIR"
LOG="$LOGDIR/$(date +%F).log"

{
  echo "===================================================================="
  echo "== Sesión $(date '+%F %T') — modelo=$MODEL, max-turns=$MAX_TURNS"
  echo "===================================================================="

  read -r COMPARTIDO PROPIO <<<"$(cupos_semanales)"
  echo "== Cupo semanal compartido: ${COMPARTIDO:-?}% (tope $TOPE_COMPARTIDO%) · propio del modelo: ${PROPIO:-?}% (tope $TOPE_PROPIO%)"
  if [ -n "$COMPARTIDO" ] && [ "$COMPARTIDO" -ge "$TOPE_COMPARTIDO" ] 2>/dev/null; then
    echo "== El cupo COMPARTIDO va al $COMPARTIDO%. Esta noche no se trabaja: lo que queda es para Ismael."
    exit 0
  fi
  if [ -n "$PROPIO" ] && [ "$PROPIO" -ge "$TOPE_PROPIO" ] 2>/dev/null; then
    echo "== El cupo propio del modelo va al $PROPIO%. Queda muy poco margen; se para."
    exit 0
  fi

  git fetch --quiet origin && git reset --hard --quiet origin/main || echo "AVISO: fallo al sincronizar con origin/main"

  # Sin MCPs: la sesión solo necesita el repo, y así no arrastra los servidores
  # del entorno personal de la Pi.
  "$CLAUDE_BIN" -p "$(cat PROMPT.md)" \
    --model "$MODEL" \
    --dangerously-skip-permissions \
    --strict-mcp-config \
    --mcp-config '{"mcpServers":{}}' \
    --max-turns "$MAX_TURNS"

  echo "== Fin $(date '+%F %T') (salida: $?)"
  read -r C P <<<"$(cupos_semanales)"; echo "== Al terminar — compartido: ${C:-?}% · propio: ${P:-?}%"
} >> "$LOG" 2>&1

# Los logs no van al repo, y no dejamos que crezcan sin fin.
find "$LOGDIR" -name '*.log' -mtime +30 -delete 2>/dev/null
