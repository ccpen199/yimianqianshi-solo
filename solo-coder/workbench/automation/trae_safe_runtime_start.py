#!/usr/bin/env python3
"""
Safely start local runtimes for Trae-generated projects.

This script is intentionally conservative:
- only starts frontend/backend inside the target project directory
- never kills existing processes
- blocks when a configured port is occupied by another cwd
- writes detached process logs under automation_probe/<group>/runtime_logs
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

from trae_round_probe import (
    LOCAL_PROJECT_ROOT,
    OUT_ROOT,
    extract_ports,
    http_probe,
    load_group,
    lsof_port,
    local_http_probes,
    unique_ports,
)


def read_json(path: Path, fallback: Any = None) -> Any:
    try:
        return json.loads(path.read_text())
    except Exception:
        return fallback


def pid_cwd(pid: str) -> str:
    try:
        completed = subprocess.run(
            ["lsof", "-a", "-p", str(pid), "-d", "cwd", "-Fn"],
            text=True,
            capture_output=True,
            check=False,
            timeout=5,
        )
    except Exception:
        return ""
    for line in (completed.stdout or "").splitlines():
        if line.startswith("n/"):
            return line[1:]
    return ""


def listener_ownership(project: Path, port: int) -> dict[str, Any]:
    info = lsof_port(port)
    owners = []
    project_real = str(project.resolve())
    for listener in info.get("listeners") or []:
        pid = str(listener.get("pid") or "")
        cwd = pid_cwd(pid)
        owners.append({**listener, "cwd": cwd, "inProject": bool(cwd and cwd.startswith(project_real))})
    return {
        **info,
        "owners": owners,
        "ownedByProject": any(item.get("inProject") for item in owners),
        "ownedByOther": bool(owners) and not any(item.get("inProject") for item in owners),
    }


def wait_for_any(urls: list[str], timeout_seconds: int) -> dict[str, Any]:
    deadline = time.time() + max(1, timeout_seconds)
    last: dict[str, Any] = {}
    while time.time() < deadline:
        for url in urls:
            result = http_probe(url)
            last = result
            if result.get("ok"):
                return result
        time.sleep(0.8)
    return last or {"ok": False, "error": "timeout", "urls": urls}


def frontend_urls(port: int) -> list[str]:
    return [f"http://127.0.0.1:{port}/", f"http://[::1]:{port}/"]


def backend_urls(port: int) -> list[str]:
    return [
        f"http://127.0.0.1:{port}/api/health",
        f"http://[::1]:{port}/api/health",
        f"http://127.0.0.1:{port}/health",
        f"http://[::1]:{port}/health",
    ]


def has_script(package_json: Path, name: str) -> bool:
    package = read_json(package_json, {})
    return bool((package.get("scripts") or {}).get(name))


def backend_command(backend_dir: Path) -> list[str] | None:
    package_json = backend_dir / "package.json"
    if package_json.exists() and has_script(package_json, "start"):
        return ["npm", "run", "start"]
    if (backend_dir / "src/server.js").exists():
        return ["node", "src/server.js"]
    if (backend_dir / "server.js").exists():
        return ["node", "server.js"]
    package = read_json(package_json, {})
    main = str(package.get("main") or "").strip()
    if main and (backend_dir / main).exists():
        return ["node", main]
    return None


def frontend_command(frontend_dir: Path, port: int) -> list[str] | None:
    vite_bin = frontend_dir / "node_modules/.bin/vite"
    if vite_bin.exists():
        return [str(vite_bin), "--host", "127.0.0.1", "--port", str(port), "--strictPort"]
    package_json = frontend_dir / "package.json"
    if package_json.exists() and has_script(package_json, "dev"):
        return ["npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", str(port), "--strictPort"]
    return None


def start_detached(command: list[str], cwd: Path, env: dict[str, str], log_path: Path) -> dict[str, Any]:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("ab", buffering=0) as log:
        header = f"\n\n===== start {time.strftime('%Y-%m-%d %H:%M:%S')} =====\ncmd: {' '.join(command)}\ncwd: {cwd}\n".encode()
        log.write(header)
        process = subprocess.Popen(
            command,
            cwd=str(cwd),
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=log,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )
    return {"pid": process.pid, "command": command, "cwd": str(cwd), "logPath": str(log_path)}


def ensure_runtime(order: str, group_dir: Path, *, wait_seconds: int, install: bool) -> dict[str, Any]:
    project = LOCAL_PROJECT_ROOT / order
    result: dict[str, Any] = {
        "order": order,
        "projectPath": str(project),
        "ok": False,
        "started": [],
        "skipped": [],
        "blocked": [],
        "errors": [],
        "frontendUrl": "",
        "backendHealthUrl": "",
    }
    if not project.exists():
        result["errors"].append("项目目录不存在")
        return result

    ports = extract_ports(project)
    frontend_ports = ports.get("frontendPorts") or []
    backend_ports = ports.get("backendPorts") or []
    result["frontendPorts"] = frontend_ports
    result["backendPorts"] = backend_ports

    log_dir = group_dir / "runtime_logs"
    env_base = os.environ.copy()
    env_base["NO_PROXY"] = "127.0.0.1,localhost,::1,*"
    env_base["no_proxy"] = "127.0.0.1,localhost,::1,*"

    backend_dir = project / "backend"
    frontend_dir = project / "frontend"

    if backend_ports:
        backend_port = int(backend_ports[0])
        ownership = listener_ownership(project, backend_port)
        if ownership.get("ownedByOther"):
            result["blocked"].append({"scope": "backend", "port": backend_port, "reason": "端口被其他项目占用", "owners": ownership.get("owners")})
        else:
            existing = wait_for_any(backend_urls(backend_port), 1) if ownership.get("ownedByProject") else {"ok": False}
            if existing.get("ok"):
                result["backendHealthUrl"] = existing.get("url") or ""
                result["skipped"].append({"scope": "backend", "port": backend_port, "reason": "已在当前项目运行"})
            else:
                package_json = backend_dir / "package.json"
                if not package_json.exists():
                    result["errors"].append("后端 package.json 不存在")
                elif not (backend_dir / "node_modules").exists() and not install:
                    result["errors"].append("后端依赖未安装，当前未启用自动 npm install")
                else:
                    if not (backend_dir / "node_modules").exists() and install:
                        subprocess.run(["npm", "install"], cwd=str(backend_dir), check=False, timeout=180)
                    command = backend_command(backend_dir)
                    if not command:
                        result["errors"].append("无法识别后端启动命令")
                    else:
                        env = env_base.copy()
                        env.update({
                            "PORT": str(backend_port),
                            "BACKEND_PORT": str(backend_port),
                            "FRONTEND_PORT": str(frontend_ports[0] if frontend_ports else ""),
                            "NODE_ENV": env.get("NODE_ENV") or "development",
                        })
                        started = start_detached(command, backend_dir, env, log_dir / f"{order}-backend.log")
                        result["started"].append({"scope": "backend", "port": backend_port, **started})
                        health = wait_for_any(backend_urls(backend_port), wait_seconds)
                        if health.get("ok"):
                            result["backendHealthUrl"] = health.get("url") or ""
                        else:
                            result["errors"].append({"scope": "backend", "port": backend_port, "reason": "启动后健康检查未通过", "lastProbe": health})
    else:
        result["errors"].append("未识别到后端端口")

    if frontend_ports:
        frontend_port = int(frontend_ports[0])
        ownership = listener_ownership(project, frontend_port)
        if ownership.get("ownedByOther"):
            result["blocked"].append({"scope": "frontend", "port": frontend_port, "reason": "端口被其他项目占用", "owners": ownership.get("owners")})
        else:
            existing = wait_for_any(frontend_urls(frontend_port), 1) if ownership.get("ownedByProject") else {"ok": False}
            if existing.get("ok"):
                result["frontendUrl"] = existing.get("url") or ""
                result["skipped"].append({"scope": "frontend", "port": frontend_port, "reason": "已在当前项目运行"})
            else:
                package_json = frontend_dir / "package.json"
                if not package_json.exists():
                    result["errors"].append("前端 package.json 不存在")
                elif not (frontend_dir / "node_modules").exists() and not install:
                    result["errors"].append("前端依赖未安装，当前未启用自动 npm install")
                else:
                    if not (frontend_dir / "node_modules").exists() and install:
                        subprocess.run(["npm", "install"], cwd=str(frontend_dir), check=False, timeout=180)
                    command = frontend_command(frontend_dir, frontend_port)
                    if not command:
                        result["errors"].append("无法识别前端启动命令")
                    else:
                        env = env_base.copy()
                        env.update({
                            "PORT": str(frontend_port),
                            "FRONTEND_PORT": str(frontend_port),
                            "BACKEND_PORT": str(backend_ports[0] if backend_ports else ""),
                            "VITE_PORT": str(frontend_port),
                            "VITE_API_URL": f"http://127.0.0.1:{backend_ports[0]}" if backend_ports else "",
                            "BROWSER": "none",
                        })
                        started = start_detached(command, frontend_dir, env, log_dir / f"{order}-frontend.log")
                        result["started"].append({"scope": "frontend", "port": frontend_port, **started})
                        frontend = wait_for_any(frontend_urls(frontend_port), wait_seconds)
                        if frontend.get("ok"):
                            result["frontendUrl"] = frontend.get("url") or ""
                        else:
                            result["errors"].append({"scope": "frontend", "port": frontend_port, "reason": "启动后前端访问未通过", "lastProbe": frontend})
    else:
        result["errors"].append("未识别到前端端口")

    final_http = []
    for port in unique_ports([*(backend_ports or []), *(frontend_ports or [])]):
        paths = ["/api/health", "/health"] if port in backend_ports else ["/"]
        for path in paths:
            final_http.extend(local_http_probes(int(port), path))
    result["http"] = final_http
    result["ok"] = bool(result.get("frontendUrl")) and bool(result.get("backendHealthUrl")) and not result.get("blocked")
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--group", help="Batch group name from prompt_state.json")
    parser.add_argument("--orders", nargs="*", default=[], help="Explicit order tokens")
    parser.add_argument("--wait-seconds", type=int, default=12)
    parser.add_argument("--install", action="store_true", help="Run npm install when node_modules is missing")
    args = parser.parse_args()

    group, orders = load_group(args.group, args.orders)
    group_dir = OUT_ROOT / group
    group_dir.mkdir(parents=True, exist_ok=True)
    results = [ensure_runtime(order, group_dir, wait_seconds=args.wait_seconds, install=args.install) for order in orders]
    report = {
        "ok": True,
        "generatedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        "group": group,
        "orders": orders,
        "install": bool(args.install),
        "results": results,
    }
    out_path = group_dir / "runtime_start_report.json"
    out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"\nreport: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
