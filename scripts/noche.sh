#!/usr/bin/env bash
# Sesión nocturna autónoma de Pinoloko. Lo lanza el timer de systemd
# pinoloko.timer en paretopi. Ver ops/ para las unidades.
set -uo pipefail

REPO="${PINOLOKO_REPO:-$HOME/pinoloko}"
MAX_TURNS="${PINOLOKO_MAX_TURNS:-1500}"
MODEL="${PINOLOKO_MODEL:-claude-fable-5-1}"
# Si el consumo semanal ya va alto, esta noche no sale: la cuota es la misma que
# usa Ismael para trabajar, y su trabajo va primero.
TOPE_SEMANAL="${PINOLOKO_TOPE_SEMANAL:-70}"
# systemd y las sesiones no interactivas no traen ~/.local/bin en el PATH.
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.local/bin/claude}"
LOGDIR="$REPO/logs"

# Lee el consumo que dejó cacheado la última sesión. Solo sirve de freno grueso:
# la cifra es de la última vez que la CLI la refrescó, no de ahora mismo.
# Devuelve el MÁS ALTO de los cupos semanales. Hay varios y no basta con mirar el
# general: el modelo con el que se trabaja tiene además su propio cupo semanal, y
# como todas las noches van con el mismo modelo, ese es el que sube deprisa.
uso_semanal() {
  python3 - <<'PYEOF' 2>/dev/null || echo ""
import json, os
try:
    u = json.load(open(os.path.expanduser("~/.claude.json")))["cachedUsageUtilization"]["utilization"]
    vals = [
        v["utilization"]
        for k, v in u.items()
        if k.startswith("seven_day") and isinstance(v, dict) and v.get("utilization") is not None
    ]
    print(max(vals) if vals else "")
except Exception:
    print("")
PYEOF
}

cd "$REPO" || { echo "No existe $REPO"; exit 1; }
mkdir -p "$LOGDIR"
LOG="$LOGDIR/$(date +%F).log"

{
  echo "===================================================================="
  echo "== Sesión $(date '+%F %T') — modelo=$MODEL, max-turns=$MAX_TURNS"
  echo "===================================================================="

  USO=$(uso_semanal)
  echo "== Cupo semanal más alto en la última lectura: ${USO:-desconocido}% (tope: $TOPE_SEMANAL%)"
  if [ -n "$USO" ] && [ "$USO" -ge "$TOPE_SEMANAL" ] 2>/dev/null; then
    echo "== Un cupo semanal va al $USO%. Esta noche no se trabaja: la reserva es para Ismael."
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
  echo "== Cupo semanal más alto tras la sesión: $(uso_semanal)%"
} >> "$LOG" 2>&1

# Los logs no van al repo, y no dejamos que crezcan sin fin.
find "$LOGDIR" -name '*.log' -mtime +30 -delete 2>/dev/null
