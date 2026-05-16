#!/usr/bin/env python3
"""
Build the next Trae prompt queue from existing batch session rows.

This queue is the production path for multi-round automation: it uses the
same facts shown in the batch session table instead of regenerating prompts
from browser reports alone.
"""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
PROMPT_STATE_PATH = REPO_ROOT / "docs/data/generated/prompt_state.json"
GENERATION_PROMPTS_PATH = REPO_ROOT / "docs/data/generated/generation_prompts.json"
SESSION_ROOT = REPO_ROOT / "docs/data/generated/trae_session_rounds"
OUT_ROOT = REPO_ROOT / "docs/data/generated/automation_probe"
ROUND_STATE_PATH = REPO_ROOT / "docs/data/generated/automation_round_state.json"
DEFAULT_TARGET_ROUNDS = 5


def read_json(path: Path, fallback: Any = None) -> Any:
    try:
        return json.loads(path.read_text())
    except Exception:
        return fallback


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2))


def clean_text(value: Any, limit: int = 1200) -> str:
    text = str(value or "").replace("\r\n", "\n").strip()
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    if len(text) > limit:
        return text[:limit].rstrip() + "..."
    return text


def one_line(value: Any, limit: int = 240) -> str:
    return clean_text(value, limit=limit).replace("\n", " ")


def normalize_order(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if text.isdigit():
        return f"may-{int(text)}"
    match = re.match(r"^[A-Za-z]+-(\d+)$", text)
    if match:
        return f"may-{int(match.group(1))}"
    return text


def parse_orders(values: Any) -> list[str]:
    raw_items: list[str] = []
    if isinstance(values, str):
        raw_items = re.split(r"[\s,，、]+", values)
    elif isinstance(values, list):
        raw_items = [str(item) for item in values]
    result: list[str] = []
    seen: set[str] = set()
    for item in raw_items:
        order = normalize_order(item)
        if order and order not in seen:
            seen.add(order)
            result.append(order)
    return result


def group_orders(group: str, explicit_orders: Any = None) -> list[str]:
    orders = parse_orders(explicit_orders or [])
    if orders:
        return orders
    state = read_json(PROMPT_STATE_PATH, {}) or {}
    groups = state.get("trae_groups") or state.get("batch_groups") or state.get("batchGroups") or {}
    return parse_orders(groups.get(group) or [])


def valid_session_row(row: dict[str, Any]) -> bool:
    session = str(row.get("sessionId") or row.get("sessionComposite") or row.get("logTraceId") or "").strip()
    conversation = str(row.get("conversation") or "").strip()
    if not session or session == "-":
        return False
    if not conversation or conversation.startswith("读取失败:") or conversation.startswith("刷新失败:"):
        return False
    return True


def retry_noise(row: dict[str, Any]) -> bool:
    conversation = str(row.get("conversation") or "")
    trace = str(row.get("logTrace") or "")
    markers = ["模型请求失败", "请稍后重试", "任务中断", "网络断开", "异常打断"]
    normalized = re.sub(r"\s+", " ", conversation).strip()
    return (
        len(trace.strip()) < 80
        and len(normalized) <= 160
        and any(normalized.startswith(marker) or normalized == marker for marker in markers)
    )


def conversation_key(row: dict[str, Any]) -> str:
    text = str(row.get("conversation") or "").strip()
    text = re.sub(r"\s+", " ", text)
    return text


def collapse_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    collapsed: list[dict[str, Any]] = []
    key_index: dict[str, int] = {}
    for row in rows:
        if not isinstance(row, dict) or not valid_session_row(row):
            continue
        if retry_noise(row):
            continue
        key = conversation_key(row)
        if key and key in key_index:
            # Repeated/withdrawn/retried conversations represent the same
            # business round. Keep the last row because it has the newest
            # trace/session outcome, but do not increase the round count.
            collapsed[key_index[key]] = row
            continue
        if key:
            key_index[key] = len(collapsed)
        collapsed.append(row)
    return collapsed


def load_generation_prompt_map() -> dict[str, dict[str, Any]]:
    items = read_json(GENERATION_PROMPTS_PATH, []) or []
    if isinstance(items, dict):
        items = items.get("prompts") or items.get("items") or []
    result: dict[str, dict[str, Any]] = {}
    if not isinstance(items, list):
        return result
    for item in items:
        if not isinstance(item, dict):
            continue
        order_folder = normalize_order(item.get("order_folder") or item.get("orderFolder") or "")
        if not order_folder:
            global_order = item.get("global_order")
            if str(global_order).strip().isdigit():
                order_folder = f"may-{int(global_order)}"
        if order_folder:
            result[order_folder] = item
    return result


def trace_digest(trace: str) -> str:
    text = str(trace or "")
    if "快速网页验收" in text:
        url_match = re.search(r"URL=([^；。\s]+)", text)
        title_match = re.search(r"标题=([^；。]+)", text)
        parts = ["快速网页验收已通过"]
        if url_match:
            parts.append(f"访问地址：{url_match.group(1)}")
        if title_match:
            parts.append(f"页面标题：{title_match.group(1)}")
        parts.append("已完成页面截图。")
        return clean_text("；".join(parts), limit=260)
    file_count = 0
    areas: list[str] = []
    for match in re.finditer(r"filePath:\s*([^\n]+)", text):
        value = match.group(1).strip()
        if not value:
            continue
        file_count += 1
        normalized = value.replace("\\", "/").lower()
        area = ""
        if "/backend/" in normalized:
            area = "后端"
        elif "/frontend/" in normalized:
            area = "前端"
        elif normalized.endswith("/.env") or "/.env" in normalized:
            area = "环境配置"
        elif "sqlite" in normalized or "/data/" in normalized:
            area = "数据库"
        else:
            area = "项目根目录"
        if area and area not in areas:
            areas.append(area)
    commands = []
    for match in re.finditer(r"command:\s*([^\n]+)", text):
        value = match.group(1).strip()
        if not value:
            continue
        label = ""
        lower = value.lower()
        if "npm install" in lower or "pnpm install" in lower or "pip install" in lower:
            label = "安装依赖"
        elif "npm run" in lower or "pnpm" in lower or "vite" in lower or "uvicorn" in lower or "python" in lower:
            label = "尝试启动/运行服务"
        elif "curl" in lower or "http://" in lower or "localhost" in lower:
            label = "接口或页面请求验证"
        elif "mkdir" in lower:
            label = "创建项目目录结构"
        else:
            label = "执行命令"
        if label and label not in commands:
            commands.append(label)
        if len(commands) >= 4:
            break
    tools = []
    for match in re.finditer(r"toolName:\s*([^\n]+)", text):
        value = match.group(1).strip()
        if value and value not in tools:
            tools.append(value)
        if len(tools) >= 8:
            break
    parts = []
    if file_count:
        area_text = "、".join(areas) if areas else "项目文件"
        parts.append(f"执行动作：创建或修改了{area_text}相关文件，共记录 {file_count} 次文件操作。")
    if commands:
        parts.append("命令动作：" + "；".join(commands))
    if tools:
        parts.append("工具链路：" + "、".join(tools[:5]))
    if not parts:
        fallback = re.sub(r"/Users/[^\s；，。)）]+/", "", text)
        parts.append(one_line(fallback, limit=360) if fallback.strip() else "日志轨迹为空或缺少可核对执行证据")
    return clean_text("\n".join(parts), limit=650)


def screenshot_summary(row: dict[str, Any]) -> str:
    screenshots = row.get("screenshots")
    if not isinstance(screenshots, list) or not screenshots:
        return "截图验收失败：没有捕获到可用结果截图，不能证明页面已启动或主流程可演示。"
    names = []
    for item in screenshots[:4]:
        if not isinstance(item, dict):
            continue
        names.append(str(item.get("resourceId") or item.get("path") or item.get("url") or "截图").strip())
    return f"本轮结果截图 {len(screenshots)} 张：" + "；".join(name for name in names if name)


def split_dissatisfaction(value: Any) -> tuple[str, str]:
    text = clean_text(value, limit=1400)
    product = ""
    process = ""
    product_match = re.search(r"产物不满意[:：]\s*(.*?)(?:过程不满意[:：]|$)", text, flags=re.S)
    process_match = re.search(r"过程不满意[:：]\s*(.*)$", text, flags=re.S)
    if product_match:
        product = clean_text(product_match.group(1), limit=700)
    if process_match:
        process = clean_text(process_match.group(1), limit=700)
    if not product and not process:
        product = text
    return product, process


def concise_trace_evidence(trace: str) -> str:
    digest = trace_digest(trace)
    return clean_text(digest, limit=650)


def original_goal_hint(conversation: Any) -> str:
    text = one_line(conversation, limit=360)
    if not text:
        return "未读取到上一轮输入摘要。"
    text = re.split(r"落地要求[:：]|组件约束[:：]|端口约束[:：]|验收约束[:：]", text, maxsplit=1)[0].strip()
    parts = re.split(r"(?<=[。！？])", text, maxsplit=1)
    if parts and parts[0].strip():
        text = parts[0].strip()
    return clean_text(text, limit=140)


def unique_items(values: list[str], limit: int = 8) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = clean_text(value, limit=180)
        if not text or text in seen:
            continue
        seen.add(text)
        result.append(text)
        if len(result) >= limit:
            break
    return result


def compact_api_failures(api_checks: list[Any]) -> list[str]:
    failures: list[str] = []
    for item in api_checks:
        if not isinstance(item, dict):
            continue
        status = int(item.get("status") or 0)
        path = str(item.get("path") or item.get("url") or "").strip()
        if not path or path == "/api/health":
            continue
        if status in {401, 403}:
            continue
        if status >= 400 or status == 0 or not item.get("ok"):
            failures.append(f"{path} 返回 {status or item.get('error') or '失败'}")
    return unique_items(failures, limit=8)


def compact_console_failures(console_messages: list[Any]) -> list[str]:
    failures: list[str] = []
    ignored = [
        "favicon.ico",
        "React Router Future Flag Warning",
        "Download the React DevTools",
        "[vite] connected",
        "[vite] connecting",
        "[antd: message]",
    ]
    for item in console_messages:
        text = json.dumps(item, ensure_ascii=False) if isinstance(item, dict) else str(item)
        if any(marker in text for marker in ignored):
            continue
        if "ErrorBoundary caught an error" in text and "getUser" in text and "undefined" in text:
            failures.append("AuthGuard 调用 getUser 解析 undefined，触发 ErrorBoundary，登录后页面被错误边界接管")
            continue
        if "<AuthGuard>" in text and "error occurred" in text:
            failures.append("AuthGuard 组件渲染时报错")
            continue
        if "error" in text.lower() or "404" in text or "500" in text:
            failures.append(one_line(text, limit=180))
    result = unique_items(failures, limit=3)
    if any("getUser" in item or "undefined" in item for item in result):
        result = [item for item in result if item != "AuthGuard 组件渲染时报错"]
    return result


def browser_action_summary(actions: list[Any]) -> str:
    labels: list[str] = []
    for item in actions:
        if not isinstance(item, dict) or not item.get("ok"):
            continue
        label = str(item.get("label") or item.get("action") or "").strip()
        if label and label not in labels:
            labels.append(label)
    if not labels:
        return ""
    joined = " -> ".join(labels)
    if "选择学生身份" in joined and "确认进入" in joined:
        return "选择学生身份并点击“确认进入”"
    if "选择老师身份" in joined and "确认进入" in joined:
        return "选择老师身份并点击“确认进入”"
    if "搜索" in joined:
        return "进入搜索并提交搜索词"
    if "后台" in joined:
        return "点击后台入口"
    if "购买" in joined or "商品" in joined or "订单" in joined:
        return "点击商品或订单入口"
    return " -> ".join(labels[:3])


def round_label(round_number: int) -> str:
    digits = "零一二三四五六七八九十"
    if 0 <= round_number <= 10:
        return f"第{digits[round_number]}轮"
    return f"第{round_number}轮"


def concise_page_issue(product_issue: str, process_issue: str) -> str:
    issue = one_line(product_issue, limit=220)
    process = one_line(process_issue, limit=180)
    issue = re.sub(r"^产物不满意[:：]\s*", "", issue).strip()
    issue = re.sub(r"^页面错误[:：]\s*", "", issue).strip()
    issue = re.sub(r"；?接口缺失[:：].*$", "", issue).strip("；。 ")
    issue = re.sub(r"；?前端崩溃原因[:：].*$", "", issue).strip("；。 ")
    issue = re.sub(r"；?资源加载失败[:：].*$", "", issue).strip("；。 ")
    issue = issue.replace("登录后页面进入错误边界，显示“加载失败/页面发生了错误/点击重试”", "页面显示“加载失败”，没有进入学生端首页")
    action = ""
    if process:
        action = process.split("；", 1)[0].strip()
    if action:
        return f"{action}后，{issue or '页面没有按预期响应'}。"
    if issue:
        return issue if issue.endswith(("。", "！", "？")) else f"{issue}。"
    return "页面操作后没有按预期响应，请按截图里的问题修复。"


def browser_report_issues(source_row: dict[str, Any]) -> tuple[str, str]:
    report_path = str(source_row.get("browserReportPath") or "").strip()
    report = read_json(Path(report_path), {}) if report_path else {}
    if not isinstance(report, dict):
        report = {}
    title = clean_text(report.get("title") or source_row.get("browserTitle") or "", limit=120)
    body = clean_text(report.get("bodyTextPreview") or "", limit=900)
    target_reason = clean_text(report.get("targetReason") or "", limit=180)
    if target_reason.startswith("未识别到特定问题页"):
        target_reason = ""
    target_matched = bool(report.get("targetMatched"))
    target_kind = clean_text(report.get("targetKind") or "", limit=80)
    final_url = clean_text(report.get("finalUrl") or report.get("url") or source_row.get("browserUrl") or "", limit=180)
    console = report.get("consoleMessages") if isinstance(report.get("consoleMessages"), list) else []
    failures = report.get("requestFailures") if isinstance(report.get("requestFailures"), list) else []
    api_checks = report.get("apiChecks") if isinstance(report.get("apiChecks"), list) else []
    actions = report.get("targetActions") if isinstance(report.get("targetActions"), list) else []
    api_failures = compact_api_failures(api_checks)
    console_failures = compact_console_failures(console)
    visible_issues: list[str] = []
    if re.search(r"加载失败|页面发生了错误|点击重试", body):
        visible_issues.append("登录后页面进入错误边界，显示“加载失败/页面发生了错误/点击重试”")
    for pattern in [r"请求失败[^。\n]*", r"没有数据[^。\n]*", r"无数据[^。\n]*", r"接口不存在[^。\n]*", r"Network Error[^。\n]*"]:
        for match in re.finditer(pattern, body, flags=re.I):
            visible_issues.append(clean_text(match.group(0), limit=80))
    visible_issues = unique_items(visible_issues, limit=4)
    if body.strip().startswith("{") or body.strip().startswith("["):
        return (
            f"打开的是接口 JSON，不是用户可操作页面；当前地址 {final_url or '-'} 需要改到真实前端路由。",
            "浏览器最终停在接口响应页，没有进入前端可操作页面。",
        )
    issue_parts: list[str] = []
    if not body.strip() or body.startswith("ERR:"):
        issue_parts.append("页面正文为空或读取失败")
    if target_reason and not target_matched:
        issue_parts.append(f"按“{target_reason}”尝试进入问题页失败，最终仍停留在 {final_url or '当前页'}")
    if visible_issues:
        issue_parts.append("页面错误：" + "；".join(visible_issues[:4]))
    if api_failures:
        issue_parts.append("接口缺失：" + "；".join(api_failures[:6]))
    if console_failures:
        issue_parts.append("前端崩溃原因：" + "；".join(console_failures))
    resource_failures = []
    for item in failures:
        if not isinstance(item, dict):
            continue
        url = str(item.get("url") or "")
        if "favicon.ico" in url:
            continue
        resource_failures.append(f"{url[:120]} {item.get('errorText') or ''}".strip())
    if resource_failures:
        issue_parts.append("资源加载失败：" + "；".join(resource_failures[:3]))
    if not issue_parts and target_matched:
        issue_parts.append(f"已进入{target_kind or '目标'}页面 {final_url or '-'}，但自动复验没有找到新的确定性错误；不要继续泛泛重做，先补测该页面的真实按钮、数据和接口")
    if not issue_parts:
        issue_parts.append("自动复验没有命中确定性问题页；需要先通过前端点击和接口探测找到具体失败点")
    process_parts = []
    action_summary = browser_action_summary(actions)
    if action_summary:
        process_parts.append(action_summary)
    if final_url:
        process_parts.append(f"最终停在：{final_url}")
    if api_checks:
        process_parts.append(f"API 复测 {len(api_checks)} 个，失败 {len(api_failures)} 个")
    if report.get("screenshotPath"):
        process_parts.append(f"问题页截图：{Path(str(report.get('screenshotPath'))).name}")
    return (
        "；".join(issue_parts),
        "；".join(process_parts) or "缺少页面点击、问题页截图和只读 API 复验。",
    )


def build_next_prompt(order: str, current_count: int, source_row: dict[str, Any], target_rounds: int) -> str:
    next_round = current_count + 1
    product_issue, process_issue = split_dissatisfaction(source_row.get("dissatisfactionReason"))
    if source_row.get("browserReportPath"):
        product_issue, process_issue = browser_report_issues(source_row)
    if not product_issue and not process_issue:
        product_issue = "页面操作后没有按预期响应，请按截图里的问题修复。"
    lines = [f"{round_label(next_round)}：{concise_page_issue(product_issue, process_issue)}"]
    return clean_text(
        "\n".join(line.strip() for line in lines if line and line.strip()),
        limit=360,
    )


def build_first_round_prompt(order: str, prompt_item: dict[str, Any], target_rounds: int) -> str:
    name = clean_text(prompt_item.get("name") or prompt_item.get("prompt_name") or order, limit=160)
    prompt = clean_text(prompt_item.get("prompt"), limit=5200)
    return clean_text(
        "\n".join([
            f"这是 {order} 的第 1 轮，总目标最多 {target_rounds} 轮。当前是首轮，没有上一轮问题需要追溯。",
            f"项目名称：{name}",
            f"首轮业务需求：{prompt}",
            "执行要求：先打通核心业务闭环；只处理当前项目目录和当前项目端口，禁止 killall/pkill/批量杀全局 Node/Python/Vite/Trae 进程；完成后后台启动前后端，打开浏览器页面截图，并请求核心 API 验证。",
            "输出要求：说明修改内容、启动地址、页面复验路径、接口结果和剩余问题；不要只写完成结论。",
        ]),
        limit=6500,
    )


def update_round_state(group: str, states: list[dict[str, Any]], target_rounds: int) -> None:
    payload = read_json(ROUND_STATE_PATH, {}) or {}
    payload.setdefault("orders", {})
    payload.setdefault("groups", {})
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    for state in states:
        order = str(state.get("order") or "")
        if not order:
            continue
        existing = payload["orders"].get(order) if isinstance(payload["orders"], dict) else {}
        if not isinstance(existing, dict):
            existing = {}
        existing.update({
            **state,
            "targetRounds": target_rounds,
            "updatedAt": now,
        })
        payload["orders"][order] = existing
    payload["groups"][group] = {
        "orders": [state.get("order") for state in states if state.get("order")],
        "targetRounds": target_rounds,
        "updatedAt": now,
    }
    write_json(ROUND_STATE_PATH, payload)


def build_queue(group: str, orders: list[str], target_rounds: int) -> dict[str, Any]:
    queue: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    states: list[dict[str, Any]] = []
    generation_prompts = load_generation_prompt_map()
    round_state = read_json(ROUND_STATE_PATH, {}) or {}
    known_order_states = round_state.get("orders") if isinstance(round_state, dict) else {}
    if not isinstance(known_order_states, dict):
        known_order_states = {}
    for order in orders:
        path = SESSION_ROOT / f"{order}.json"
        payload = read_json(path, {}) or {}
        raw_rows = payload.get("rows") if isinstance(payload, dict) else []
        if not isinstance(raw_rows, list):
            raw_rows = []
        rows = collapse_rows(raw_rows)
        actual_count = len(rows)
        known_state = known_order_states.get(order)
        if not isinstance(known_state, dict):
            known_state = {}
        try:
            optimistic_count = int(known_state.get("optimisticCompletedRounds") or 0)
        except (TypeError, ValueError):
            optimistic_count = 0
        optimistic_source = known_state.get("optimisticSource")
        if not isinstance(optimistic_source, dict):
            optimistic_source = {}
        uses_optimistic = optimistic_count > actual_count and bool(optimistic_source)
        current_count = optimistic_count if uses_optimistic else actual_count
        next_round_index = current_count + 1
        state = {
            "order": order,
            "rawRowCount": len(raw_rows),
            "effectiveRoundCount": current_count,
            "actualEffectiveRoundCount": actual_count,
            "nextRoundIndex": next_round_index,
            "hasSessionCache": path.exists(),
            "optimisticActive": uses_optimistic,
            "status": "pending",
        }
        if current_count >= target_rounds:
            state["status"] = "reached_target"
            states.append(state)
            skipped.append({"order": order, "reason": f"已达到 {target_rounds} 轮", "currentRoundCount": current_count})
            continue
        if not rows and not uses_optimistic:
            browser_report_path = OUT_ROOT / group / f"{order}-browser-report.json"
            browser_report = read_json(browser_report_path, {}) if browser_report_path.exists() else {}
            if isinstance(browser_report, dict) and browser_report.get("screenshotPath"):
                screenshot_name = Path(str(browser_report.get("screenshotPath") or "")).name
                runtime_current_count = 1
                source_row = {
                    "conversation": "",
                    "dissatisfactionReason": "",
                    "logTrace": (
                        f"快速网页验收已完成；URL={browser_report.get('finalUrl') or browser_report.get('url') or '-'}；"
                        f"标题={browser_report.get('title') or '-'}；截图={screenshot_name or '-'}。"
                    ),
                    "screenshots": [{"resourceId": screenshot_name or "frontend-screenshot"}],
                    "browserReportPath": str(browser_report_path),
                    "browserUrl": browser_report.get("finalUrl") or browser_report.get("url") or "",
                    "browserTitle": browser_report.get("title") or "",
                }
                prompt = build_next_prompt(order, runtime_current_count, source_row, target_rounds)
                state["status"] = "queued_runtime_repair"
                state["effectiveRoundCount"] = runtime_current_count
                state["actualEffectiveRoundCount"] = actual_count
                state["nextRoundIndex"] = runtime_current_count + 1
                states.append(state)
                queue.append({
                    "order": order,
                    "priority": "runtime-repair",
                    "score": 95,
                    "currentRoundCount": runtime_current_count,
                    "nextRoundIndex": runtime_current_count + 1,
                    "targetRounds": target_rounds,
                    "sourceRowIndex": -1,
                    "sessionId": "",
                    "issues": [one_line(prompt, limit=180)],
                    "conversation": "",
                    "dissatisfactionReason": "",
                    "hasScreenshots": True,
                    "logTraceDigest": trace_digest(str(source_row.get("logTrace") or "")),
                    "prompt": prompt,
                    "browserReportPath": str(browser_report_path),
                })
                continue
            prompt_item = generation_prompts.get(order)
            if not prompt_item:
                state["status"] = "missing_first_prompt"
                states.append(state)
                skipped.append({
                    "order": order,
                    "reason": "首轮待输入，但没有在数据列表找到对应业务 prompt",
                    "currentRoundCount": 0,
                    "nextRoundIndex": 1,
                })
                continue
            prompt = build_first_round_prompt(order, prompt_item, target_rounds)
            state["status"] = "queued_first_round"
            states.append(state)
            queue.append({
                "order": order,
                "priority": "first-round",
                "score": 100,
                "currentRoundCount": 0,
                "nextRoundIndex": 1,
                "targetRounds": target_rounds,
                "sourceRowIndex": -1,
                "sessionId": "",
                "issues": ["首轮输入"],
                "conversation": "",
                "dissatisfactionReason": "",
                "hasScreenshots": False,
                "logTraceDigest": "首轮暂无日志轨迹",
                "prompt": prompt,
                "promptName": prompt_item.get("name") or "",
            })
            continue
        source_row = optimistic_source if uses_optimistic else rows[-1]
        state["status"] = "queued_next_round"
        states.append(state)
        queue.append({
            "order": order,
            "priority": "round-web-verified" if uses_optimistic else "round",
            "score": max(10, 100 - current_count),
            "currentRoundCount": current_count,
            "nextRoundIndex": current_count + 1,
            "targetRounds": target_rounds,
            "sourceRowIndex": raw_rows.index(source_row) if source_row in raw_rows else current_count - 1,
            "sessionId": source_row.get("sessionId") or source_row.get("sessionComposite") or "",
            "issues": [one_line(source_row.get("dissatisfactionReason") or source_row.get("conversation"), limit=180)],
            "conversation": clean_text(source_row.get("conversation"), limit=1400),
            "dissatisfactionReason": clean_text(source_row.get("dissatisfactionReason"), limit=1400),
            "hasScreenshots": bool(source_row.get("screenshots")),
            "logTraceDigest": trace_digest(str(source_row.get("logTrace") or "")),
            "prompt": build_next_prompt(order, current_count, source_row, target_rounds),
        })
    update_round_state(group, states, target_rounds)
    return {
        "ok": True,
        "generatedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        "group": group,
        "targetRounds": target_rounds,
        "queue": queue,
        "skipped": skipped,
        "counts": {
            "queued": len(queue),
            "skipped": len(skipped),
            "orders": len(orders),
        },
        "source": "trae_session_rounds",
        "roundStatePath": str(ROUND_STATE_PATH),
    }


def render_markdown(payload: dict[str, Any]) -> str:
    lines = [
        f"# 轮次输入队列：{payload.get('group')}",
        "",
        f"- 生成时间：{payload.get('generatedAt')}",
        f"- 目标轮次：{payload.get('targetRounds')}",
        f"- 待提交：{payload.get('counts', {}).get('queued', 0)}",
        f"- 跳过：{payload.get('counts', {}).get('skipped', 0)}",
        "",
    ]
    for index, item in enumerate(payload.get("queue") or [], start=1):
        lines.extend([
            f"## {index}. {item.get('order')} -> 第 {item.get('nextRoundIndex')} 轮",
            "",
            f"- 当前有效轮次：{item.get('currentRoundCount')}",
            f"- 来源行：{item.get('sourceRowIndex')}",
            f"- 截图：{'有' if item.get('hasScreenshots') else '无'}",
            "",
            "### Prompt",
            "",
            "```text",
            item.get("prompt") or "",
            "```",
            "",
        ])
    skipped = payload.get("skipped") or []
    if skipped:
        lines.extend(["## 跳过", ""])
        for item in skipped:
            lines.append(f"- {item.get('order')}: {item.get('reason')}")
    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--group", required=True)
    parser.add_argument("--orders", nargs="*")
    parser.add_argument("--target-rounds", type=int, default=DEFAULT_TARGET_ROUNDS)
    args = parser.parse_args()
    group = str(args.group or "").strip()
    if not group:
        raise SystemExit("group is required")
    target_rounds = args.target_rounds if args.target_rounds > 0 else DEFAULT_TARGET_ROUNDS
    orders = group_orders(group, args.orders)
    payload = build_queue(group, orders, target_rounds)
    out_dir = OUT_ROOT / group
    json_path = out_dir / "round_prompt_queue.json"
    md_path = out_dir / "round_prompt_queue.md"
    write_json(json_path, payload)
    md_path.write_text(render_markdown(payload))
    print(json.dumps({"ok": True, "jsonPath": str(json_path), "markdownPath": str(md_path), **payload}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
