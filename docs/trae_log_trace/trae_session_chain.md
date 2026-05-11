# Trae SessionId 链路构建与排障指南

更新时间：2026-05-05

这份文档记录 Workbench 中 Trae 会话轮次的完整抽取链路。它用于两个场景：

- 以后 `sessionId`、会话内容、日志轨迹再次错位时，有固定排查依据。
- 在其他电脑上部署同一套 Workbench 时，知道 Trae 本地数据库、日志和页面字段如何对齐。

## 目标格式

页面 `sessionId` 列和 `日志轨迹` 列都应展示完整 Trae 复合轨迹，而不是只展示 24 位原始会话 id：

```text
.{userId}:{traceId}_{rawSessionId}.{responseMessageId}.{chatMessageId}:Trae CN.T(YYYY/M/D HH:MM:SS)
```

示例：

```text
.3792634309254663:6e1103793404adeb94b029e2142ddcf6_69f64d5185d83e4a45ef7bb6.69f65aa085d83e4a45ef7bbe.69f65aa04913fbefd1e54e65:Trae CN.T(2026/5/2 23:12:16)
```

字段含义：

- `userId`：Trae 账号或用户 id，例如 `3792634309254663`。
- `traceId`：ai-agent 日志中的 32 位追踪 id。
- `rawSessionId`：Trae 聊天会话的 24 位原始 session id。
- `responseMessageId`：模型响应、任务或版本消息 id，用于复合轨迹第二段。
- `chatMessageId`：用户输入对应的消息 id，用于定位一轮对话。
- `Trae CN.T(...)`：本轮输入的规范时间。当前代码优先取 ai-agent `create message` 日志时间；没有日志时间时，退回 `chatMessageId` 的 ObjectId 时间，再退回第二段 `response/task` id 的 ObjectId 时间；不能用后续 renderer 展示时间或刷新时间覆盖。

页面顶部的 `当前会话` 仍保留 24 位原始 session id；表格每一行的 `sessionId` 和 `日志轨迹` 才是完整复合轨迹。接口行数据同时保留 `rawSessionId`，方便程序内部继续使用原始 id。

## 代码入口

- 后端抽取与缓存：`solo-coder/workbench/serve_workbench.py`
- 前端展示与刷新隔离：`solo-coder/workbench/app.js`
- 页面缓存版本：`solo-coder/workbench/index.html`
- 回归脚本：`scripts/check_trae_session_rounds.py`
- 统一启动脚本：`solo-coder/workbench/start_workbench.sh`
- 缓存目录：`data/generated/trae_session_rounds/`，该目录是机器本地数据，不提交到 Git。

## 本机数据来源

配置采用“环境变量优先、系统默认兜底”的方式，避免绑定单台 Mac 的绝对路径：

```text
TRAE_ROOT                  项目根目录，默认 macOS/Windows 为 ~/Documents/trae_projects
TRAE_APP_SUPPORT_DIR        Trae 本机数据目录，默认 macOS 为 ~/Library/Application Support/Trae CN，Windows 为 %APPDATA%\Trae CN
TRAE_WORKSPACE_STORAGE_DIR  默认为 TRAE_APP_SUPPORT_DIR/User/workspaceStorage
TRAE_APP_NAME               默认 Trae CN
TRAE_CLI                    Trae CLI 或可执行文件路径；未配置时从 PATH 和常见安装目录探测
```

每台机器只需要把这些变量指到本机真实目录即可。不要把某台机器的 `docs/data/generated` 缓存复制到另一台机器使用。

Trae 的关键本地数据：

- 工作区数据库：`TRAE_WORKSPACE_STORAGE_DIR/*/state.vscdb`
- 工作区映射：`workspace.json`，用于从 `local_projects/<序号>` 找到对应 `state.vscdb`
- 数据库表：`ItemTable`
- 数据库 key：`memento/icube-ai-agent-storage`、`icube-ai-agent-storage-input-history`、`ChatStore`
- 日志目录：`TRAE_APP_SUPPORT_DIR/logs/**/`
- 优先日志：`Modular/ai-agent*.log`
- 辅助日志：`renderer*.log`

## 抽取链路

1. 后端收到序号，例如 `xm-12175`。
2. 根据 `TRAE_ROOT/local_projects/xm-12175` 在 Trae `workspaceStorage` 中找到对应 `state.vscdb`。
3. 从 `memento/icube-ai-agent-storage` 读取当前 24 位 `currentSessionId`。
4. 从 `icube-ai-agent-storage-input-history` 读取用户输入文本和附件信息。
5. 从 `ChatStore` 读取本会话的消息 turn id，先拿到每轮输入对应的 `chatMessageId`。
6. 扫描 ai-agent 日志，按 `chatMessageId` 回填 `traceId`、`rawSessionId`、`responseMessageId` 和规范时间。
7. 如 ChatStore 缺少旧轮次，则按 `rawSessionId` 继续扫会话日志，把同一 session 下的消息 id 合并回来。
8. 精准日志搜索不能只依赖 `launchctl` 的 PATH。服务进程要显式尝试 `/opt/homebrew/bin/rg`、`/usr/local/bin/rg` 等固定路径，否则 HTTP 进程可能拿不到旧轮次。
9. `full` 和 `precise` 两条抽取路径都可用时，刷新应保留行数更多的一侧；不能让 3 轮回退覆盖成 2 轮。
10. renderer 日志只做兜底，用于补齐可见 UI block 或 message 信息；它的较晚展示时间不能覆盖 ai-agent `create message` 时间。
11. 按规范时间排序，再把输入历史与消息 id 对齐。
12. 输出行数据：
    - `sessionId`：完整复合轨迹。
    - `logTrace`：完整复合轨迹。
    - `rawSessionId`：24 位原始 session id。
    - `conversation`：该轮用户输入。

## 正确性标准

单个序号打开后，表格应满足：

- `sessionId` 列不是 `69f...` 这种 24 位短 id，而是以 `.` 开头的完整复合轨迹。
- `日志轨迹` 列与 `sessionId` 列一致。
- `rawSessionId` 等于页面顶部 `当前会话` 的 24 位 id。
- 时间是本轮用户消息创建时间，不是后来刷新页面或 renderer 打印展示日志的时间。
- 多轮会话按真实发生时间排列，不能把第二轮、第三轮的 prompt 和 trace 对错。
- 正常情况下不应出现 `missing_trace`、`missing_session`、`missing_chat`；如果出现，先查日志是否被清理或 Trae 是否未打开过该项目。

## 常用操作

统一从 Workbench 目录启动，不再手动起零散服务：

```bash
cd /Users/chen/Desktop/Cursor_project/ai_money/yimianqianshi/solo-coder/workbench
sh start_workbench.sh
```

脚本默认执行 `restart 8090`。可用命令：

```bash
sh start_workbench.sh status
sh start_workbench.sh restart
sh start_workbench.sh stop
sh start_workbench.sh open
```

接口检查：

```bash
curl 'http://127.0.0.1:8090/api/trae-session-rounds?order=xm-12175'
curl -X POST 'http://127.0.0.1:8090/api/refresh-trae-session-rounds' \
  -H 'Content-Type: application/json' \
  -d '{"order":"xm-12175"}'
```

回归检查：

```bash
cd /Users/chen/Desktop/Cursor_project/ai_money/yimianqianshi
python3 scripts/check_trae_session_rounds.py
python3 -m py_compile solo-coder/workbench/serve_workbench.py
node --check solo-coder/workbench/app.js
```

## 其他电脑构建链路

在另一台 Mac 或 Windows 上复用时，需要先确认环境和路径：

1. 安装并登录 Trae CN。
2. 用 Trae 打开过目标项目，确保生成 `workspaceStorage/*/state.vscdb`。
3. 本地项目路径要能和 Workbench 序号对应，例如 `TRAE_ROOT/local_projects/xm-12175`。
4. 安装 Python 3；Node 只用于 `node --check` 前端语法检查。
5. 安装 `rg` 更好；没有 `rg` 时会降级为较慢的文件扫描。
6. 按新电脑实际路径设置环境变量：
   - `TRAE_ROOT`
   - `TRAE_APP_SUPPORT_DIR`
   - `TRAE_WORKSPACE_STORAGE_DIR`
   - `TRAE_APP_NAME`
   - `TRAE_CLI`
7. 启动 Workbench 后先跑一个已知序号，确认接口返回完整复合轨迹。

PowerShell 示例：

```powershell
$env:TRAE_ROOT="$env:USERPROFILE\Documents\trae_projects"
$env:TRAE_APP_SUPPORT_DIR="$env:APPDATA\Trae CN"
$env:TRAE_APP_NAME="Trae CN"
python solo-coder\workbench\serve_workbench.py 8090
```

如果新电脑不是 `Trae CN`，而是英文版 Trae 或安装目录不同，重点检查两类路径：

- 应用数据目录是否包含 `User/workspaceStorage` 和 `logs`
- 启动命令是否能通过 `TRAE_CLI` 或 PATH 找到

## 机器本地数据不要同步

以下路径只代表当前电脑的运行状态、批量组、轮次缓存和截图缓存：

```text
docs/data/generated/generation_prompts.json
docs/data/generated/prompt_state.json
docs/data/generated/trae_session_rounds/
docs/data/generated/feishu_screenshot_paste/
docs/data-bak/
```

`prompt_state.json` 内含批量组 `trae_groups`，不同机器必须独立维护。提交远程仓库时只提交代码和文档，不提交这些数据文件。

## 已知坑位

- 旧服务占用 `8090` 时，浏览器可能仍在访问旧代码。统一执行 `sh start_workbench.sh`，不要只刷新页面。
- 浏览器可能缓存旧 `app.js`。如果前端逻辑改过，需要同步提高 `index.html` 里的 `app.js?v=...`。
- 不能把 `sessionId` 列归一化成 24 位短 id。用户要复制的是完整复合轨迹。
- renderer 日志时间通常晚于真实输入时间，只能兜底补字段，不能作为首选时间。
- `launchctl` 启动的服务 PATH 可能找不到 `rg`。如果终端里是 3 条而 HTTP 刷新只有 2 条，先查后端是否还在依赖 PATH。
- ChatStore 可能缺历史轮次，需要合并 ai-agent session 日志。
- input history 可能包含旧输入或未发送输入；只有找到对应 chat id 的记录才可靠。
- 批量或单项刷新要按序号隔离。点击一个序号的刷新按钮，只能更新该序号；其他未点击的序号不能跟着刷新。
- `xm-12175` 和 `xm-12236` 的示例不要混用。`69f69d...` 那组完整轨迹属于 `xm-12236`，不是 `xm-12175`。

## 快速排障表

| 现象 | 优先检查 |
|---|---|
| `sessionId` 只显示 24 位短 id | 检查后端 `normalize_trae_session_rows` 和前端 `normalizeSessionRow` 是否把复合轨迹覆盖掉 |
| `日志轨迹` 为空 | 检查 ai-agent 日志是否存在，`TRAE_LOG_SCAN_LIMIT` 是否覆盖到对应日期 |
| 时间显示成刷新时间 | 检查是否缺少 ai-agent `create message`，不要用 renderer 后续展示日志覆盖 |
| prompt 和 trace 错位 | 检查 `ChatStore` turn id 排序、日志回填、按时间排序和 input history 对齐 |
| 终端调用 3 条，HTTP 刷新只有 2 条 | 检查 `rg` 是否只在终端 PATH 存在；服务进程应使用显式 `rg` 候选路径，并比较 `full/precise` 行数 |
| 页面还是旧结果 | 执行 `sh start_workbench.sh`，再确认 `index.html` 的 `app.js?v=...` 是否已更新 |
| 刷新一个序号影响其他序号 | 检查前端 `refreshingSessionOrders`、`sessionLoadRequestId`、`activeSessionOrder` 判断 |
| 接口找不到 DB | 检查 Trae 是否打开过项目，以及 `workspace.json` 是否指向 `local_projects/<序号>` |

## 固定回归口径

每次修改 session 链路后，至少验证：

- `python3 scripts/check_trae_session_rounds.py` 输出 `OK`。
- `sessionId == logTrace`。
- `rawSessionId == payload.sessionId`。
- 复合轨迹符合目标格式。
- 已知样本时间与 ai-agent `create message` 时间一致。
- 单项刷新只更新当前序号。
