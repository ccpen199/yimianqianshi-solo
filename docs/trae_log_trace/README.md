# Trae 日志轨迹资料索引与实现判断

更新时间：2026-05-06

## 目录内容

本目录集中保存 Trae 会话、日志轨迹搜索、UI 自动化复制相关资料。

```text
docs/trae_log_trace/
  README.md
  search/
    xm-20791-trae-log-trace-search-plan.md
  automation/
    trae_window_log_trace_automation_20260505.md
    screenshots/
  session_id_summary/
    trae_session_common_rules_20260504.md
    trae_session_solution_comparison_20260504.md
  trae_session_chain.md
  trae_session_extraction.json
  trae_session_extraction_report.md
  trae_session_refresh_rules_20260503.md
```

## 已经实现的能力

### 1. Trae sessionId / logTrace 搜索

代码位置：

```text
solo-coder/workbench/serve_workbench.py
```

相关函数和接口：

```text
extract_trae_session_rounds_precise(order_token)
extract_trae_session_rounds(order_token, include_trace=True, ...)
GET /api/trae-session-rounds?order=xm-xxxxx
POST /api/refresh-trae-session-rounds
```

当前实现会读取 Trae CN 的 workspace `state.vscdb`，结合本地日志里的 `create message, chat_session_id: ... message_id: ... trace_id: ...` 行，拼出 Trae composite logTrace/sessionId。

对 `xm-20791` 的本机验证结果：

```text
sessionId: 69f877d77f0ec5291f1c8cb8
workspace db: /Users/chen/Library/Application Support/Trae CN/User/workspaceStorage/5fcbf412bb7ab31b79418b71793b94b2/state.vscdb
```

结论：这一部分已经可用。

### 2. Trae UI 官方“复制日志轨迹”按钮扫描

代码位置：

```text
solo-coder/workbench/serve_workbench.py
```

相关函数和接口：

```text
_trae_copy_log_trace_visible(order_token, mode='click'|'probe', ...)
trae_copy_log_trace(order_token, mode='click'|'probe'|'collect', scan='visible'|'scroll', ...)
POST /api/trae-copy-log-trace
```

实现方式：

- AppleScript 负责激活 Trae CN 并聚焦包含订单号的窗口。
- Swift Accessibility 扫描窗口 AX 树。
- 目标按钮通过 `copy-all` / `复制全部` 等可访问性字段识别，并排除 `task-copy-btn`。
- `click` / `collect` 模式通过 `AXPress` 点击按钮，再用 `pbpaste` 读取剪贴板。
- `scan:"scroll"` 会先滚到较早位置，再逐屏向下扫描。

当前验证结果：

```text
POST /api/trae-copy-log-trace {"order":"xm-20791","mode":"probe","scan":"visible"}

ok: true
matched: false
copied: false
error: TRAE CN app not found
```

结论：接口和自动化链路已经实现，但依赖当前桌面上存在对应 Trae CN 窗口。本次机器状态下没有找到 `xm-20791` 窗口，所以没有复制到官方原文。

## 尚未实现的能力

### renderer + ai-agent 日志重建器

方案文档：

```text
docs/trae_log_trace/search/xm-20791-trae-log-trace-search-plan.md
```

计划能力：

- 扫描 `renderer.1.log`、`renderer.log`、`ai-agent stdout`。
- 过滤 `session_id` / `message_id`。
- 提取 `tool_call_show`、`file_tool_show`、`run_script_show`、`run_script_success`。
- 用 `tool_id` / `serverCallId` 关联 `runCommandInTerminal` 和 `commandResult`。
- 输出类似 Trae “复制日志轨迹”的纯文本 transcript。
- 明确标注 `reconstructed: true`，不冒充官方复制原文。

代码搜索结论：当前没有找到已经落地的 transcript 重建器实现。现有代码主要实现了 sessionId/logTrace 搜索和 UI 官方复制按钮扫描。

## 可行性判断

日志轨迹搜索方案可以分成两层：

1. 找 session/logTrace：已实现，可继续使用。
2. 拿“日志轨迹正文”：有两条路。

官方复制路径可行，但依赖 UI 状态：

- Trae CN 必须运行。
- 目标订单窗口标题里要包含 `xm-xxxxx`。
- 对话区必须能暴露 `copy-all` / `复制全部` 按钮。
- AX 扫描成本较高，滚动扫描可能耗时较长。

日志重建路径可行，但结果只能是重建版：

- 工具调用轨迹、命令、文件路径、成功失败状态大概率可以从 renderer/ai-agent 日志恢复。
- assistant 自然语言、最终总结、官方空行和字段裁剪规则不能保证逐字恢复。
- 输出必须带 `reconstructed: true` 和 `missing` 字段。

## 推荐下一步实现

优先新增一个独立重建接口，避免影响现有官方复制链路：

```text
POST /api/trae-reconstruct-log-trace
```

建议输入：

```json
{
  "order": "xm-20791",
  "sessionId": "69f877d77f0ec5291f1c8cb8",
  "messageId": "69f922e61a2b3e3034d5d8e2"
}
```

建议输出：

```json
{
  "ok": true,
  "order": "xm-20791",
  "source": "renderer-ai-agent-reconstruction",
  "officialCopied": false,
  "reconstructed": true,
  "traceText": "...",
  "events": [],
  "missing": [
    "assistant_text_exact",
    "official_copy_format_exact"
  ]
}
```

落地顺序：

1. 先实现只读解析器，扫描 Trae CN logs，按 session/message 过滤事件。
2. 先输出结构化 `events`，不要急着拼纯文本。
3. 再把 `run_command`、文件工具、browser 工具格式化为 transcript。
4. 最后接入 Workbench API 和页面按钮。

