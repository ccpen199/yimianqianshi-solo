#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="${1:-$HOME/.codex/config.toml}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "[ERROR] config file not found: $CONFIG_FILE" >&2
  exit 1
fi

python3 - "$CONFIG_FILE" <<'PY'
import sys
import tomllib

path = sys.argv[1]
with open(path, "rb") as f:
    cfg = tomllib.load(f)

active = cfg.get("model_provider", "")
providers = cfg.get("model_providers", {})

print(f"config: {path}")
print(f"active model_provider: {active or '(unset)'}")
if not providers:
    print("providers: (none)")
    raise SystemExit(0)

print("providers:")
for pid, p in providers.items():
    name = p.get("name", "") if isinstance(p, dict) else ""
    base = p.get("base_url", "") if isinstance(p, dict) else ""
    wire = p.get("wire_api", "") if isinstance(p, dict) else ""
    mark = "*" if pid == active else " "
    print(f"{mark} {pid:16s} | name={name} | base_url={base} | wire_api={wire}")
PY
