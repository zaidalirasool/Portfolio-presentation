#!/usr/bin/env bash
# Interview-mode static server for the deck.
#
#   npm run interview          start a watchdog-restarted http.server on :8765,
#                              detached from the terminal so closing it / Mac
#                              sleeping / a flaky request crashing the handler
#                              cannot bring the deck down
#   npm run interview:stop     kill the watchdog AND any python on the port
#   npm run interview:status   show whether the watchdog and the server are up
#   npm run interview:logs     tail -f the watchdog log
#
# Why a watchdog: python3's http.server is a single-threaded toy server. A
# broken pipe in the middle of an asset download has been observed to leave
# the server in a state where new connections hang. The loop here reaps the
# python process and respawns within ~1s so the deck self-heals.

set -u

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT=8765
HOST=127.0.0.1
URL="http://$HOST:$PORT/"
LOG="$PROJECT_ROOT/.interview-server.log"
PID_FILE="$PROJECT_ROOT/.interview-watchdog.pid"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"
}

free_port() {
  local pids
  pids=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    log "Port $PORT held by PIDs: $pids — killing"
    # shellcheck disable=SC2086
    kill -TERM $pids 2>/dev/null || true
    sleep 0.4
    # shellcheck disable=SC2086
    kill -KILL $pids 2>/dev/null || true
    sleep 0.2
  fi
}

case "${1:-help}" in
  watchdog)
    # Internal: never invoke directly. Started detached by `start`.
    cd "$PROJECT_ROOT"
    log "Watchdog start (PID $$); serving $PROJECT_ROOT on $URL"
    trap 'log "Watchdog received SIGTERM, exiting"; exit 0' TERM INT
    while true; do
      free_port
      python3 -m http.server "$PORT" --bind "$HOST" >> "$LOG" 2>&1 &
      child=$!
      log "python3 http.server started (PID $child)"
      wait "$child"
      ec=$?
      log "Server exited (code $ec) — respawning in 1s"
      sleep 1
    done
    ;;

  start)
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "Interview server already running (watchdog PID $(cat "$PID_FILE"))."
      echo "URL: $URL"
      echo "Logs: $LOG"
      exit 0
    fi
    rm -f "$PID_FILE"
    : > "$LOG"
    # nohup + & + disown so closing Terminal / Cursor cannot reap the watchdog
    nohup "$0" watchdog >/dev/null 2>&1 &
    pid=$!
    echo "$pid" > "$PID_FILE"
    disown "$pid" 2>/dev/null || true

    # Wait up to 5s for the server to be reachable
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      if curl -sf -m 1 "$URL" >/dev/null 2>&1; then
        echo "Interview server up at $URL  (watchdog PID $pid)"
        echo "Logs: $LOG"
        exit 0
      fi
      sleep 0.5
    done
    echo "Started watchdog (PID $pid) but $URL is not responding yet."
    echo "Tail the log to see what happened:  npm run interview:logs"
    exit 1
    ;;

  stop)
    if [[ -f "$PID_FILE" ]]; then
      pid=$(cat "$PID_FILE")
      if kill -0 "$pid" 2>/dev/null; then
        kill -TERM "$pid" 2>/dev/null || true
        sleep 0.3
        kill -KILL "$pid" 2>/dev/null || true
        log "Watchdog stopped via stop command (PID $pid)"
      fi
      rm -f "$PID_FILE"
    fi
    free_port
    echo "Interview server stopped."
    ;;

  status)
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "Watchdog: RUNNING (PID $(cat "$PID_FILE"))"
    else
      echo "Watchdog: NOT RUNNING"
    fi
    if curl -sf -m 2 "$URL" >/dev/null 2>&1; then
      echo "Server:   responding at $URL"
    else
      echo "Server:   NOT responding at $URL"
    fi
    echo "Logs:     $LOG"
    ;;

  logs)
    : > /dev/null
    if [[ ! -f "$LOG" ]]; then
      echo "No log file yet at $LOG"
      exit 0
    fi
    tail -f "$LOG"
    ;;

  *)
    cat <<EOF
Usage: $0 {start|stop|status|logs}
  start   launch watchdog-restarted http.server on $URL (detached)
  stop    kill the watchdog and free port $PORT
  status  show whether watchdog + server are up
  logs    tail the watchdog log
EOF
    exit 1
    ;;
esac
