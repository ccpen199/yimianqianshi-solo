#!/usr/bin/env python3
"""
Build a serial Trae submit queue from generated next-round prompt drafts.

This script does not click Trae and does not submit prompts. It filters low
value issues and produces an explicit queue for the later UI Operator.
"""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
AUTOMATION_PROBE_ROOT = REPO_ROOT / "docs/data/generated/automation_probe"


LOW_VALUE_PATTERNS = [
    "favicon.ico",
    "React Router Future Flag Warning",
    "Download the React DevTools",
]

HIGH_VALUE_PATTERNS = [
    "正文没有可见文本",
    "白屏",
    "根组件未渲染",
    "路由空挂载",
    "工程启动入口缺失",
    "目录结构不标准",
    "没有可访问运行态",
    "未识别到前端端口",
    "未识别到后端端口",
    "未发现 frontend/package.json",
    "未发现 backend/package.json",
]

MEDIUM_VALUE_PATTERNS = [
    "请求失败",
    "net::ERR_ABORTED",
    "外链",
    "接口",
    "HTTP 异常响应",
    "主视觉",
    "视频",
    "封面",
]


def read_json(path: Path, fallback: Any = None) -> Any:
    try:
        return json.loads(path.read_text())
    except Exception:
        return fallback


def clean_text(value: Any) -> str:
    text = str(value or "").replace("\r\n", "\n").strip()
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def match_any(text: str, patterns: list[str]) -> bool:
    return any(pattern in text for pattern in patterns)


def issue_score(issues: list[str]) -> tuple[int, str]:
    if not issues:
        return 0, "没有明确问题"
    non_low = [issue for issue in issues if not match_any(issue, LOW_VALUE_PATTERNS)]
    if not non_low:
        return 0, "只有低优先级静态资源/开发提示问题"
    joined = "\n".join(non_low)
    if match_any(joined, HIGH_VALUE_PATTERNS):
        return 90, "高优先级：影响页面可见内容、运行态或工程入口"
    if match_any(joined, MEDIUM_VALUE_PATTERNS):
        return 60, "中优先级：影响核心资源、接口或媒体加载"
    return 40, "普通优先级：存在明确可修复问题"


def priority_label(score: int) -> str:
    if score >= 80:
        return "high"
    if score >= 50:
        return "medium"
    if score > 0:
        return "normal"
    return "skip"


def project_by_order(probe: dict[str, Any], order: str) -> dict[str, Any]:
    for project in probe.get("projects") or []:
        if str(project.get("order") or "") == order:
            return project
    return {}


def build_queue(group: str) -> dict[str, Any]:
    group_dir = AUTOMATION_PROBE_ROOT / group
    drafts_path = group_dir / "next_prompt_drafts.json"
    probe_path = group_dir / "probe.json"
    runtime_path = group_dir / "runtime_start_report.json"
    drafts_payload = read_json(drafts_path, {})
    probe = read_json(probe_path, {})
    runtime = read_json(runtime_path, {})
    queued: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []

    runtime_by_order = {
        str(item.get("order") or ""): item
        for item in runtime.get("results") or []
        if isinstance(item, dict)
    }

    for item in drafts_payload.get("drafts") or []:
        order = str(item.get("order") or "").strip()
        if not order:
            continue
        issues = [clean_text(issue) for issue in item.get("issues") or [] if clean_text(issue)]
        score, reason = issue_score(issues)
        project = project_by_order(probe, order)
        runtime_item = runtime_by_order.get(order) or {}
        windows = project.get("traeWindows") or []
        entry = {
            "order": order,
            "priority": priority_label(score),
            "score": score,
            "reason": reason,
            "issues": issues,
            "frontendUrl": item.get("frontendUrl") or runtime_item.get("frontendUrl") or "",
            "backendHealthUrl": item.get("backendHealthUrl") or runtime_item.get("backendHealthUrl") or "",
            "windowAvailable": bool(windows),
            "traeWindows": windows,
            "runtimeOk": bool(runtime_item.get("ok")),
            "prompt": clean_text(item.get("draft")),
        }
        if score <= 0:
            entry["skipReason"] = reason
            skipped.append(entry)
        else:
            queued.append(entry)

    queued.sort(key=lambda row: (-int(row.get("score") or 0), str(row.get("order") or "")))
    output = {
        "ok": True,
        "generatedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        "group": group,
        "queue": queued,
        "skipped": skipped,
        "counts": {
            "queued": len(queued),
            "skipped": len(skipped),
            "high": sum(1 for item in queued if item.get("priority") == "high"),
            "medium": sum(1 for item in queued if item.get("priority") == "medium"),
            "normal": sum(1 for item in queued if item.get("priority") == "normal"),
        },
        "source": {
            "draftsPath": str(drafts_path),
            "probePath": str(probe_path),
            "runtimePath": str(runtime_path),
        },
    }
    return output


def markdown_report(payload: dict[str, Any]) -> str:
    lines = [
        f"# Trae 串行待提交队列：{payload.get('group')}",
        "",
        f"生成时间：{payload.get('generatedAt')}",
        "",
        "说明：本文件只生成队列，不点击 Trae，不提交 prompt。",
        "",
        "## 待提交",
        "",
    ]
    queue = payload.get("queue") or []
    if not queue:
        lines.append("无。")
    for index, item in enumerate(queue, start=1):
        lines.extend([
            f"### {index}. {item.get('order')} [{item.get('priority')}]",
            "",
            f"- 原因：{item.get('reason')}",
            f"- Trae 窗口：{'有' if item.get('windowAvailable') else '未发现'}",
            f"- 前端：{item.get('frontendUrl') or '-'}",
            f"- 后端：{item.get('backendHealthUrl') or '-'}",
            "- 问题：",
        ])
        for issue in item.get("issues") or []:
            lines.append(f"  - {issue}")
        lines.extend(["", "Prompt：", "", "```text", item.get("prompt") or "", "```", ""])
    lines.extend(["", "## 跳过", ""])
    skipped = payload.get("skipped") or []
    if not skipped:
        lines.append("无。")
    for item in skipped:
        lines.append(f"- {item.get('order')}：{item.get('skipReason') or item.get('reason')}")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--group", required=True)
    args = parser.parse_args()
    group = str(args.group or "").strip()
    if not group:
        raise SystemExit("--group is required")
    group_dir = AUTOMATION_PROBE_ROOT / group
    group_dir.mkdir(parents=True, exist_ok=True)
    payload = build_queue(group)
    json_path = group_dir / "submit_queue.json"
    md_path = group_dir / "submit_queue.md"
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    md_path.write_text(markdown_report(payload))
    print(json.dumps({
        "ok": True,
        "group": group,
        "json": str(json_path),
        "markdown": str(md_path),
        "counts": payload.get("counts"),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
