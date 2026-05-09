#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL_FILE="${ROOT_DIR}/.workbench-lan.url"
PID_FILE="${ROOT_DIR}/.workbench-lan.pid"
PLIST_FILE="${HOME}/Library/LaunchAgents/com.yimianqianshi.workbench.lan.plist"

if command -v launchctl >/dev/null 2>&1 && [ -f "${PLIST_FILE}" ]; then
  launchctl bootout "gui/$(id -u)" "${PLIST_FILE}" >/dev/null 2>&1 || true
fi

if [ -f "${PID_FILE}" ] && kill -0 "$(cat "${PID_FILE}")" >/dev/null 2>&1; then
  kill "$(cat "${PID_FILE}")"
  echo "LAN Workbench 已停止: $(cat "${PID_FILE}")"
  rm -f "${PID_FILE}"
  exit 0
fi

if [ -f "${URL_FILE}" ]; then
  PORT="$(cat "${URL_FILE}" | sed -E 's#.*:([0-9]+)/.*#\1#')"
  PIDS="$(lsof -tiTCP:"${PORT}" -sTCP:LISTEN || true)"
  if [ -n "${PIDS}" ]; then
    echo "${PIDS}" | xargs kill
    echo "LAN Workbench 已停止端口: ${PORT}"
    rm -f "${PID_FILE}"
    exit 0
  fi
fi

echo "没有运行中的 LAN Workbench。"
