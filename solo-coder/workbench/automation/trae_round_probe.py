#!/usr/bin/env python3
"""
Probe a batch of Trae project runtimes without clicking Trae windows.

This script is intentionally read-only for Trae and project processes:
- it reads prompt_state groups
- parses per-project port hints
- checks listening ports and HTTP endpoints
- lists matching Trae window titles on macOS
- writes a JSON report for later orchestration
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
PROMPT_STATE_PATH = REPO_ROOT / "docs/data/generated/prompt_state.json"
LOCAL_PROJECT_ROOT = Path(os.environ.get("TRAE_LOCAL_PROJECT_ROOT", "/Users/chen/Documents/trae_projects/local_projects"))
OUT_ROOT = REPO_ROOT / "docs/data/generated/automation_probe"


def run_cmd(args: list[str], *, timeout: int = 8) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, text=True, capture_output=True, check=False, timeout=timeout)


def read_text(path: Path, limit: int = 120_000) -> str:
    try:
        return path.read_text(errors="ignore")[:limit]
    except Exception:
        return ""


def parse_env(text: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        result[key.strip()] = value.strip().strip('"').strip("'")
    return result


def parse_int(value: Any) -> int | None:
    try:
        port = int(str(value).strip())
    except Exception:
        return None
    return port if 0 < port < 65536 else None


def unique_ports(values: list[int | None]) -> list[int]:
    seen: set[int] = set()
    result: list[int] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def extract_ports(project: Path) -> dict[str, Any]:
    env_files = [project / ".env", project / "backend/.env", project / "frontend/.env"]
    envs: dict[str, str] = {}
    env_sources: dict[str, str] = {}
    for env_file in env_files:
        parsed = parse_env(read_text(env_file))
        for key, value in parsed.items():
            envs[key] = value
            env_sources[key] = str(env_file)

    frontend_text = "\n".join(read_text(p) for p in [project / "frontend/vite.config.js", project / "frontend/vite.config.ts"])
    backend_text = "\n".join(read_text(p) for p in [project / "backend/src/server.js", project / "backend/server.js"])
    frontend_package_text = read_text(project / "frontend/package.json")
    backend_package_text = read_text(project / "backend/package.json")

    vite_ports = [parse_int(m.group(1)) for m in re.finditer(r"\bport\s*:\s*(\d{2,5})", frontend_text)]
    proxy_ports = [parse_int(m.group(1)) for m in re.finditer(r"localhost:(\d{2,5})", frontend_text)]
    server_ports = [parse_int(m.group(1)) for m in re.finditer(r"process\.env\.PORT\s*\|\|\s*(\d{2,5})", backend_text)]
    server_ports = [p for p in server_ports if p]
    frontend_package_ports = [parse_int(m.group(1) or m.group(2)) for m in re.finditer(r"--port\s+(\d{2,5})|localhost:(\d{2,5})", frontend_package_text)]
    backend_package_ports = [parse_int(m.group(1) or m.group(2)) for m in re.finditer(r"--port\s+(\d{2,5})|localhost:(\d{2,5})", backend_package_text)]

    frontend_ports = unique_ports([
        parse_int(envs.get("FRONTEND_PORT")),
        parse_int(envs.get("VITE_PORT")),
        *vite_ports,
        *frontend_package_ports,
    ])
    backend_ports = unique_ports([
        parse_int(envs.get("BACKEND_PORT")),
        parse_int(envs.get("PORT")),
        *proxy_ports,
        *server_ports,
        *backend_package_ports,
    ])

    return {
        "env": envs,
        "envSources": env_sources,
        "frontendPorts": frontend_ports,
        "backendPorts": backend_ports,
    }


def lsof_port(port: int) -> dict[str, Any]:
    completed = run_cmd(["lsof", "-nP", f"-iTCP:{port}", "-sTCP:LISTEN"], timeout=5)
    lines = [line for line in (completed.stdout or "").splitlines() if line.strip()]
    listeners: list[dict[str, Any]] = []
    for line in lines[1:]:
        parts = line.split()
        if len(parts) >= 9:
            listeners.append({
                "command": parts[0],
                "pid": parts[1],
                "user": parts[2],
                "protocol": parts[4],
                "name": " ".join(parts[8:]),
            })
    return {
        "port": port,
        "listening": len(lines) > 1,
        "listeners": listeners,
        "raw": lines[:8],
    }


def http_probe(url: str) -> dict[str, Any]:
    started = time.time()
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(url, timeout=3) as resp:
            body = resp.read(500).decode("utf-8", errors="ignore")
            return {
                "url": url,
                "ok": 200 <= resp.status < 500,
                "status": resp.status,
                "elapsedMs": int((time.time() - started) * 1000),
                "bodyPreview": body,
            }
    except urllib.error.HTTPError as exc:
        body = exc.read(500).decode("utf-8", errors="ignore")
        return {
            "url": url,
            "ok": False,
            "status": exc.code,
            "elapsedMs": int((time.time() - started) * 1000),
            "bodyPreview": body,
        }
    except Exception as exc:
        return {
            "url": url,
            "ok": False,
            "error": str(exc),
            "elapsedMs": int((time.time() - started) * 1000),
        }


def local_http_probes(port: int, path: str) -> list[dict[str, Any]]:
    suffix = path if path.startswith("/") else f"/{path}"
    return [
        http_probe(f"http://localhost:{port}{suffix}"),
        http_probe(f"http://127.0.0.1:{port}{suffix}"),
        http_probe(f"http://[::1]:{port}{suffix}"),
    ]


def trae_windows() -> list[str]:
    if sys.platform != "darwin":
        return []
    script = 'tell application "System Events" to tell process "Electron" to get name of every window'
    completed = run_cmd(["osascript", "-e", script], timeout=8)
    if completed.returncode != 0:
        return []
    return [part.strip() for part in (completed.stdout or "").replace("\n", ",").split(",") if part.strip()]


def load_group(group: str | None, orders: list[str]) -> tuple[str, list[str]]:
    if orders:
        return group or "custom-orders", orders
    if not group:
        raise SystemExit("Either --group or --orders is required")
    state = json.loads(PROMPT_STATE_PATH.read_text())
    batch_groups = state.get("trae_groups") or state.get("batch_groups") or state.get("batchGroups") or {}
    if group not in batch_groups:
        raise SystemExit(f"Group not found: {group}")
    return group, list(batch_groups[group])


def project_probe(order: str, windows: list[str]) -> dict[str, Any]:
    project = LOCAL_PROJECT_ROOT / order
    ports = extract_ports(project)
    frontend_ports = ports["frontendPorts"]
    backend_ports = ports["backendPorts"]
    probes: list[dict[str, Any]] = []
    for port in backend_ports:
        probes.extend(local_http_probes(port, "/api/health"))
        probes.extend(local_http_probes(port, "/health"))
    for port in frontend_ports:
        probes.extend(local_http_probes(port, "/"))

    return {
        "order": order,
        "projectPath": str(project),
        "projectExists": project.exists(),
        "traeWindows": [name for name in windows if order in name],
        "hasFrontendPackage": (project / "frontend/package.json").exists(),
        "hasBackendPackage": (project / "backend/package.json").exists(),
        "hasFrontendNodeModules": (project / "frontend/node_modules").exists(),
        "hasBackendNodeModules": (project / "backend/node_modules").exists(),
        **ports,
        "ports": [lsof_port(port) for port in unique_ports([*frontend_ports, *backend_ports])],
        "http": probes,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--group", help="Batch group name from prompt_state.json")
    parser.add_argument("--orders", nargs="*", default=[], help="Explicit order tokens")
    args = parser.parse_args()

    group, orders = load_group(args.group, args.orders)
    windows = trae_windows()
    report = {
        "ok": True,
        "generatedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        "group": group,
        "orders": orders,
        "localProjectRoot": str(LOCAL_PROJECT_ROOT),
        "traeWindowCount": len(windows),
        "traeWindows": windows,
        "projects": [project_probe(order, windows) for order in orders],
    }
    out_dir = OUT_ROOT / group
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "probe.json"
    out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"\nreport: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
