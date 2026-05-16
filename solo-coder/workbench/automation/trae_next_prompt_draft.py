#!/usr/bin/env python3
"""
Generate next-round Trae prompt drafts from non-UI automation reports.

Inputs:
- docs/data/generated/automation_probe/<group>/probe.json
- optional <order>-browser-report.json
- optional <order>-frontend.png

This script does not click Trae windows and does not submit prompts.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import struct
import time
import zlib
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
AUTOMATION_PROBE_ROOT = REPO_ROOT / "docs/data/generated/automation_probe"


def read_json(path: Path, fallback: Any = None) -> Any:
    try:
        return json.loads(path.read_text())
    except Exception:
        return fallback


def safe_text(value: Any, limit: int = 1200) -> str:
    text = str(value or "").replace("\r\n", "\n").strip()
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text[:limit]


def clean_clause(value: Any) -> str:
    text = str(value or "").strip()
    text = re.sub(r"\s+", " ", text)
    return text.rstrip("。；;,.， ")


def join_clauses(values: list[str], limit: int | None = None) -> str:
    items = [clean_clause(item) for item in values if clean_clause(item)]
    if limit:
        items = items[:limit]
    return "；".join(items)


def paeth_predictor(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def png_black_stats(path: Path) -> dict[str, Any]:
    """Return simple black-pixel stats for 8-bit non-interlaced PNG files."""
    if not path.is_file():
        return {"ok": False, "error": "missing image"}
    data = path.read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        return {"ok": False, "error": "not png"}

    offset = 8
    width = height = color_type = bit_depth = interlace = None
    idat = bytearray()
    while offset + 8 <= len(data):
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        chunk_type = data[offset + 4:offset + 8]
        chunk_data = data[offset + 8:offset + 8 + length]
        offset += 12 + length
        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type, _compression, _filter, interlace = struct.unpack(">IIBBBBB", chunk_data)
        elif chunk_type == b"IDAT":
            idat.extend(chunk_data)
        elif chunk_type == b"IEND":
            break

    if not width or not height or bit_depth != 8 or interlace != 0 or color_type not in {2, 6}:
        return {
            "ok": False,
            "error": f"unsupported png width={width} height={height} bitDepth={bit_depth} colorType={color_type} interlace={interlace}",
        }

    channels = 3 if color_type == 2 else 4
    stride = width * channels
    raw = zlib.decompress(bytes(idat))
    rows: list[bytes] = []
    prev = bytearray(stride)
    src = 0
    for _y in range(height):
        filter_type = raw[src]
        src += 1
        scan = bytearray(raw[src:src + stride])
        src += stride
        recon = bytearray(stride)
        for i, value in enumerate(scan):
            left = recon[i - channels] if i >= channels else 0
            up = prev[i]
            up_left = prev[i - channels] if i >= channels else 0
            if filter_type == 0:
                recon[i] = value
            elif filter_type == 1:
                recon[i] = (value + left) & 0xFF
            elif filter_type == 2:
                recon[i] = (value + up) & 0xFF
            elif filter_type == 3:
                recon[i] = (value + ((left + up) // 2)) & 0xFF
            elif filter_type == 4:
                recon[i] = (value + paeth_predictor(left, up, up_left)) & 0xFF
            else:
                return {"ok": False, "error": f"unsupported filter {filter_type}"}
        rows.append(bytes(recon))
        prev = recon

    def ratio(x0: int, y0: int, x1: int, y1: int) -> float:
        total = black = 0
        for y in range(max(0, y0), min(height, y1)):
            row = rows[y]
            for x in range(max(0, x0), min(width, x1)):
                idx = x * channels
                r, g, b = row[idx], row[idx + 1], row[idx + 2]
                total += 1
                if r < 28 and g < 28 and b < 28:
                    black += 1
        return black / total if total else 0.0

    return {
        "ok": True,
        "width": width,
        "height": height,
        "blackRatio": round(ratio(0, 0, width, height), 4),
        "mainVisualBlackRatio": round(ratio(int(width * 0.06), int(height * 0.16), int(width * 0.94), int(height * 0.76)), 4),
    }


def project_by_order(probe: dict[str, Any], order: str) -> dict[str, Any]:
    for project in probe.get("projects") or []:
        if str(project.get("order")) == order:
            return project
    return {"order": order}


def ok_http(project: dict[str, Any], suffix: str = "") -> list[str]:
    urls = []
    for item in project.get("http") or []:
        url = str(item.get("url") or "")
        if item.get("ok") and (not suffix or url.endswith(suffix)):
            urls.append(url)
    return urls


def is_browser_error_page(text: Any, navigation_error: Any = "") -> bool:
    body = str(text or "")
    error = str(navigation_error or "")
    markers = [
        "无法访问此网站",
        "ERR_CONNECTION_REFUSED",
        "ERR_EMPTY_RESPONSE",
        "ERR_CONNECTION_RESET",
        "This site can’t be reached",
        "This site can't be reached",
    ]
    return any(marker in body or marker in error for marker in markers)


def listening_ports(project: dict[str, Any]) -> list[int]:
    return [int(item.get("port")) for item in project.get("ports") or [] if item.get("listening")]


def summarize_console(report: dict[str, Any]) -> dict[str, Any]:
    messages = report.get("consoleMessages") or []
    texts = [str(item.get("text") or "") for item in messages if isinstance(item, dict)]
    key_warning_count = sum("Encountered two children with the same key" in text for text in texts)
    location_fail_count = sum("获取位置失败" in text for text in texts)
    favicon_404 = any(
        ("favicon.ico" in text and "404" in text)
        or "favicon.ico" in str(item.get("location", {}).get("url", ""))
        for item, text in zip(messages, texts)
        if isinstance(item, dict)
    )
    severe = []
    for text in texts:
        if "Encountered two children with the same key" in text:
            severe.append("React key 重复告警")
        elif "获取位置失败" in text:
            severe.append("位置获取失败")
        elif "Failed to load resource" in text:
            severe.append(text[:120])
    return {
        "keyWarningCount": key_warning_count,
        "locationFailCount": location_fail_count,
        "favicon404": favicon_404,
        "severe": list(dict.fromkeys(severe))[:8],
    }


def frontend_url(project: dict[str, Any]) -> str:
    for item in project.get("http") or []:
        url = str(item.get("url") or "")
        if item.get("ok") and re.search(r":\d+/$|\]:\d+/$", url):
            return url
    return ""


def backend_health_url(project: dict[str, Any]) -> str:
    for item in project.get("http") or []:
        url = str(item.get("url") or "")
        if item.get("ok") and (url.endswith("/api/health") or url.endswith("/health")):
            return url
    ports = project.get("backendPorts") or []
    if ports:
        return f"http://127.0.0.1:{ports[0]}/api/health"
    return ""


def make_draft(order: str, project: dict[str, Any], report: dict[str, Any] | None, image_stats: dict[str, Any]) -> dict[str, Any]:
    evidence: list[str] = []
    issues: list[str] = []
    actions: list[str] = []

    front_ports = project.get("frontendPorts") or []
    back_ports = project.get("backendPorts") or []
    listen = listening_ports(project)
    front_url = frontend_url(project)
    health_url = backend_health_url(project)

    if not project.get("projectExists", False):
        issues.append("项目目录不存在，无法启动或验收。")
        actions.append("先恢复项目目录和基础工程结构，再继续实现业务功能。")
    else:
        evidence.append(f"项目目录存在：{project.get('projectPath')}")

    if front_ports or back_ports:
        evidence.append(f"配置端口：前端 {front_ports or '-'}，后端 {back_ports or '-'}。")
    if listen:
        evidence.append(f"正在监听的项目端口：{listen}。")
    else:
        issues.append("配置端口当前均未监听，前后端没有可访问运行态。")

    if project.get("projectExists", False) and not project.get("hasFrontendPackage"):
        issues.append("未发现 frontend/package.json，前端工程启动入口缺失或目录结构不标准。")
    if project.get("projectExists", False) and not project.get("hasBackendPackage"):
        issues.append("未发现 backend/package.json，后端工程启动入口缺失或目录结构不标准。")
    if not project.get("hasFrontendNodeModules"):
        issues.append("前端依赖未安装，不能直接启动浏览器验收。")
    if not project.get("hasBackendNodeModules"):
        issues.append("后端依赖未安装，不能直接启动 API 验收。")

    if report:
        if report.get("status"):
            evidence.append(f"浏览器访问 {report.get('url')} 返回 HTTP {report.get('status')}，页面标题为“{report.get('title') or '-'}”。")
        if health_url:
            evidence.append(f"后端健康检查地址：{health_url}。")
        browser_error_page = is_browser_error_page(report.get("bodyTextPreview"), report.get("navigationError"))
        text_preview = "" if browser_error_page else safe_text(report.get("bodyTextPreview"), 260)
        if text_preview:
            evidence.append(f"页面正文可见片段：{text_preview}")
        elif not browser_error_page and report.get("ok"):
            issues.append("页面 HTTP 200 但正文没有可见文本，疑似根组件未渲染、路由空挂载或页面白屏。")
        if browser_error_page:
            issues.append(f"浏览器访问 {report.get('url')} 未进入业务页面，返回的是浏览器连接错误页。")

        console = summarize_console(report)
        if console["keyWarningCount"]:
            issues.append(f"Recommend.jsx 出现 React key 重复告警 {console['keyWarningCount']} 次，列表 key 生成不稳定，可能导致视频项重复、状态错乱或更新异常。")
        if console["locationFailCount"]:
            issues.append(f"位置获取失败出现 {console['locationFailCount']} 次，同城定位失败缺少明确可见的兜底状态。")
        if console["favicon404"]:
            issues.append("favicon.ico 返回 404，静态资源兜底不完整。")
        for failure in report.get("requestFailures") or []:
            issues.append(f"请求失败：{failure.get('method')} {failure.get('url')} {failure.get('errorText')}")
        for response in report.get("responseErrors") or []:
            issues.append(f"HTTP 异常响应：{response.get('status')} {response.get('url')}")

    if image_stats.get("ok"):
        evidence.append(
            f"截图尺寸 {image_stats.get('width')}x{image_stats.get('height')}，主视觉黑色像素占比 {image_stats.get('mainVisualBlackRatio')}。"
        )
        if float(image_stats.get("mainVisualBlackRatio") or 0) >= 0.72:
            issues.append("推荐页首屏主视觉区域大面积黑屏，没有显示真实视频画面或封面图。")
    elif report and image_stats:
        evidence.append(f"截图分析失败：{image_stats.get('error')}")

    if (
        report
        and report.get("ok")
        and front_url
        and not is_browser_error_page(report.get("bodyTextPreview"), report.get("navigationError"))
        and any("主视觉" in issue for issue in issues)
    ):
        actions.append("优先检查推荐页 video/cover 渲染、video poster、自动播放/静音策略、封面图兜底和样式层级，确保首屏每条推荐能看到明确的视频画面或封面。")
    if any("React key" in issue for issue in issues):
        actions.append("修复 Recommend.jsx 推荐列表 key 使用方式，避免使用重复字段或数组索引导致状态错乱。")
    if any("位置获取失败" in issue for issue in issues):
        actions.append("为同城定位失败提供默认城市、重新定位入口或明显提示，不要只在控制台打印。")
    if any("正文没有可见文本" in issue for issue in issues):
        actions.append("优先检查前端入口挂载、路由默认页、根组件渲染条件和接口初始化异常，确保首页有可见业务内容而不是空白 DOM。")
    if any("请求失败" in issue for issue in issues):
        actions.append("检查失败资源或接口的来源，避免核心页面依赖不可控外链；必要时改成本地静态资源、后端代理或可见兜底封面。")
    if not project.get("hasFrontendNodeModules") or not project.get("hasBackendNodeModules"):
        actions.append("根据 frontend/backend 的 package.json 补齐依赖安装，并确认启动脚本、.env、CORS 和代理配置都指向当前项目端口。")
    if not project.get("hasFrontendPackage") or not project.get("hasBackendPackage"):
        actions.append("先恢复标准前后端工程入口，补齐 package.json、启动脚本和端口配置，再进入浏览器与 API 验收。")
    if not listen:
        actions.append("按当前项目配置端口启动前后端，只处理本项目端口；不要 killall/pkill 全局 Node 进程。")
    if not actions:
        actions.append("按当前业务需求继续补齐核心页面和主链路，并用浏览器与 API 共同验收。")

    unique_issues = list(dict.fromkeys(issues))
    unique_actions = list(dict.fromkeys(actions))
    unique_evidence = list(dict.fromkeys(evidence))

    if report and report.get("ok") and not is_browser_error_page(report.get("bodyTextPreview"), report.get("navigationError")):
        intro = f"当前 {front_url or report.get('url')} 可以打开"
        if health_url:
            intro += f"，后端健康检查 {health_url} 可用"
        intro += "，说明已有运行态可以进入浏览器验收。"
    elif front_url:
        intro = f"当前探测到可访问的前端地址是 {front_url}，但浏览器验收报告没有使用该地址或未成功进入业务页面，需要重新用可访问地址截图验收。"
    else:
        intro = "当前项目还没有形成稳定可访问的运行态，需要先把前后端启动链路补齐。"

    draft_parts = [intro]
    if unique_evidence:
        draft_parts.append("已核对到的证据：" + join_clauses(unique_evidence, 5) + "。")
    if unique_issues:
        draft_parts.append("需要优先修复的问题：" + join_clauses(unique_issues, 6) + "。")
    draft_parts.append("请按以下顺序处理：" + join_clauses(unique_actions, 6) + "。")
    if front_ports or back_ports:
        draft_parts.append(
            f"修复后请重新启动当前项目端口（前端 {front_ports or '-'}，后端 {back_ports or '-'}），只处理当前项目进程，不要杀死其他项目端口，并用浏览器截图和 API 请求验证主链路。"
        )

    return {
        "order": order,
        "frontendUrl": front_url,
        "backendHealthUrl": health_url,
        "evidence": unique_evidence,
        "issues": unique_issues,
        "actions": unique_actions,
        "imageStats": image_stats,
        "draft": "\n\n".join(draft_parts),
    }


def markdown_report(group: str, drafts: list[dict[str, Any]]) -> str:
    lines = [
        f"# 下一轮反馈草稿：{group}",
        "",
        f"生成时间：{time.strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "说明：本文件由非 UI 自动化探测报告生成，没有点击 Trae 窗口，也没有自动提交 prompt。",
        "",
    ]
    for item in drafts:
        lines.extend([
            f"## {item['order']}",
            "",
            "### 证据",
            "",
        ])
        for evidence in item.get("evidence") or ["-"]:
            lines.append(f"- {evidence}")
        lines.extend(["", "### 问题", ""])
        for issue in item.get("issues") or ["未从当前报告中提取到明确问题。"]:
            lines.append(f"- {issue}")
        lines.extend(["", "### 下一轮 Prompt 草稿", "", "```text", item.get("draft") or "", "```", ""])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--group", required=True)
    parser.add_argument("--orders", nargs="*", default=[])
    args = parser.parse_args()

    group_dir = AUTOMATION_PROBE_ROOT / args.group
    probe = read_json(group_dir / "probe.json", {})
    if not probe:
        raise SystemExit(f"probe.json not found or invalid: {group_dir / 'probe.json'}")

    orders = args.orders or probe.get("orders") or []
    drafts = []
    for order in orders:
        project = project_by_order(probe, order)
        report_path = group_dir / f"{order}-browser-report.json"
        report = read_json(report_path, None)
        screenshot_path = group_dir / f"{order}-frontend.png"
        if report and report.get("screenshotPath"):
            candidate = Path(str(report.get("screenshotPath")))
            if not candidate.is_absolute():
                candidate = REPO_ROOT / candidate
            screenshot_path = candidate
        stats = png_black_stats(screenshot_path) if screenshot_path.exists() else {"ok": False, "error": "missing screenshot"}
        drafts.append(make_draft(order, project, report, stats))

    output_json = group_dir / "next_prompt_drafts.json"
    output_md = group_dir / "next_prompt_drafts.md"
    output_json.write_text(json.dumps({"ok": True, "group": args.group, "drafts": drafts}, ensure_ascii=False, indent=2))
    output_md.write_text(markdown_report(args.group, drafts))
    print(json.dumps({"ok": True, "group": args.group, "json": str(output_json), "markdown": str(output_md), "orders": orders}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
