#!/usr/bin/env bash
# Sesión nocturna autónoma de Pinoloko. Lo lanza el timer de systemd
# pinoloko.timer en paretopi. Ver ops/ para las unidades.
set -uo pipefail

REPO="${PINOLOKO_REPO:-$HOME/pinoloko}"
MAX_TURNS="${PINOLOKO_MAX_TURNS:-1500}"
MODEL="${PINOLOKO_MODEL:-claude-fable-5-1}"
# systemd y las sesiones no interactivas no traen ~/.local/bin en el PATH.
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.local/bin/claude}"
LOGDIR="$REPO/logs"

cd "$REPO" || { echo "No existe $REPO"; exit 1; }
mkdir -p "$LOGDIR"
LOG="$LOGDIR/$(date +%F).log"

{
  echo "===================================================================="
  echo "== Sesión $(date '+%F %T') — modelo=$MODEL, max-turns=$MAX_TURNS"
  echo "===================================================================="

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
} >> "$LOG" 2>&1

# Los logs no van al repo, y no dejamos que crezcan sin fin.
find "$LOGDIR" -name '*.log' -mtime +30 -delete 2>/dev/null
