# Trae SessionId 方案差异对比

更新时间：2026-05-05

本文只记录不同文档、不同修复阶段之间的方案差异和冲突。稳定共识看 `trae_session_common_rules_20260504.md`。

## 时间线

| 时间 | 来源 | 方案重点 | 当前判断 |
|---|---|---|---|
| 2026-04-29 18:26:47 | `trae_session_extraction.json` | 扫描 Trae workspaceStorage，记录 workspace、session、input_history、ChatStore 是否存在 | 基础盘点方案，不负责生成完整 composite |
| 2026-05-03 13:28:14 | `trae_session_extraction_report.md` | 报告 workspace 覆盖情况和输入历史数量 | 证明数据来源存在，但不能证明每轮都有 trace |
| 2026-05-03 15:14:30 | `trae_session_chain.md` | 使用 `trace_rawSessionId.responseMessageId.chatMessageId` 作为目标格式 | 更接近当前实操中 `xm-20768` 这类真实 composite |
| 2026-05-03 20:57:03 | `trae_session_refresh_rules_20260503.md` | 强调以 `create message` 为主，提出 `trace_rawSessionId.userMessageId.userMessageId` | 解决污染和时间错位，但与 responseMessageId 方案存在冲突 |
| 2026-05-04 | 当前排错补充 | 对旧日志做精准 `create message` 搜索，并保留真实 response/task id | 当前实际采用：create message 定主链路，第二段可用真实 response/task id |
| 2026-05-04 20:55 | 方案 E | 手动刷新同步精准拉取并覆盖缓存 | 当前推荐落地方案：刷新必须重新拉取，不能只显示旧缓存 |
| 2026-05-05 | 方案 F | 显式 `rg` 路径 + `full/precise` 双通道刷新取更多行 + 行数保护 | 当前代码实际方案；解决 `launchctl` 环境漏轮次、`xm-20789` 刷新 2/3 条不一致 |

## 方案 A：基础扫描方案

来源：

- `trae_session_extraction.json`
- `trae_session_extraction_report.md`

时间：

- 生成时间：2026-04-29 18:26:47
- 报告修改时间：2026-05-03 13:28:14

核心：

- 扫描 `workspaceStorage/*/state.vscdb`。
- 找每个 workspace 的 `current_session_id`。
- 统计 `input_history_count`。
- 记录 `ChatStore` 和模型配置是否存在。

优点：

- 能确认项目有没有 Trae workspace。
- 能确认 input_history 是否存在。
- 适合做覆盖率报告。

不足：

- 不生成完整 composite sessionId。
- 不证明存在真实 `trace_id`。
- 不能判断前端是否应该显示 rows。

结论：

这个方案只能作为“有没有数据源”的第一步，不能作为最终 sessionId 生成方案。

## 方案 B：responseMessageId 链路方案

来源：

- `docs/trae_session_chain.md`

时间：

- 修改时间：2026-05-03 15:14:30

目标格式：

```text
.{userId}:{traceId}_{rawSessionId}.{responseMessageId}.{chatMessageId}:Trae CN.T(YYYY/M/D HH:MM:SS)
```

核心判断：

- `chatMessageId` 是用户输入消息 id。
- `responseMessageId` 是模型响应、任务或版本消息 id。
- renderer 日志可用于补 UI block、tool、response 信息。
- renderer 的晚时间不能覆盖 ai-agent 创建时间。

优点：

- 能表达 Trae 的真实前端链路。
- 能覆盖 `xm-20768` 这类结构：

```text
.3792634309254663:15a66672f1af56c69d526b04660fd109_69f7db857f0ec5291f1c7fa8.69f84bc87f0ec5291f1c84f4.69f84bc88d6da18af1089f91:Trae CN.T(2026/5/4 10:33:28)
```

其中：

- `69f84bc88d6da18af1089f91` 来自 ai-agent `create message`。
- `69f84bc87f0ec5291f1c84f4` 来自 renderer/file summary 或响应侧消息。
- 时间仍取 `create message` 的 `2026/5/4 10:33:28`。

风险：

- 如果 response/task id 找错，会导致第二段漂移。
- 如果时间取 response/task id 内嵌时间，可能偏离 create message。

当前判断：

可采用，但必须加限制：第二段只能用同 session、同轮、真实日志里的 response/task id；时间仍以 create message 为准。

## 方案 C：userMessageId.userMessageId 纯 create-message 方案

来源：

- `docs/trae_session_refresh_rules_20260503.md`

时间：

- 修改时间：2026-05-03 20:57:03

目标格式：

```text
.{userId}:{traceId}_{rawSessionId}.{userMessageId}.{userMessageId}:Trae CN.T(YYYY/M/D HH:MM:SS)
```

核心判断：

- 以 `create message` 用户消息创建行为唯一主链路。
- 时间取 create message。
- tool/plan/block/renderer 只补 trace，不覆盖 message id 和时间。
- 禁止 `missing_trace`。
- 新刷新为空时不覆盖旧缓存。

优点：

- 极稳，不容易错配。
- 对 `xm-12232` 这种时间错位问题有效。
- 能防止 tool/block 时间覆盖用户消息时间。
- 能防止为了凑行数复用 trace。

不足：

- 会丢失真实 response/task id。
- 与 `trae_session_chain.md` 的 `responseMessageId.chatMessageId` 格式冲突。
- 与当前用户给出的真实样本不完全一致。

冲突样本：

用户确认正确的 `xm-20768` 第三条是：

```text
.3792634309254663:15a66672f1af56c69d526b04660fd109_69f7db857f0ec5291f1c7fa8.69f84bc87f0ec5291f1c84f4.69f84bc88d6da18af1089f91:Trae CN.T(2026/5/4 10:33:28)
```

如果强制套 `userMessageId.userMessageId`，会变成：

```text
.3792634309254663:15a66672f1af56c69d526b04660fd109_69f7db857f0ec5291f1c7fa8.69f84bc88d6da18af1089f91.69f84bc88d6da18af1089f91:Trae CN.T(2026/5/4 10:33:28)
```

这和真实案例不一致。

当前判断：

该方案适合作为保底方案。找不到真实 response/task id 时，可以退回 `userMessageId.userMessageId`；但不能覆盖已确认的真实 `responseMessageId.chatMessageId`。

## 方案 D：2026-05-04 当前实操方案

来源：

- 2026-05-04 对 `xm-20768/xm-20770/xm-20774/xm-20776`
- 2026-05-04 对 `xm-12245` 到 `xm-12255`

核心规则：

1. `create message` 是主链路，决定：

- `rawSessionId`
- `chatMessageId`
- `traceId`
- `Trae CN.T(...)` 时间

2. 第二段优先使用真实 response/task id，但必须满足：

- 来自同一个 `rawSessionId`。
- 与该轮 `chatMessageId` 同轮或时间接近。
- 出现在 renderer/tool/file_summary/block 等真实日志中。
- 不能用别的轮次 id。

3. 如果找不到可靠 response/task id：

- 可以退回 `chatMessageId`。
- 不能写 `missing_trace`。
- 不能写短 id。

4. 如果旧缓存已有更准确的真实 composite：

- 后续刷新不能用退化 composite 覆盖。

优点：

- 兼容 `trae_session_chain.md` 的目标格式。
- 保留 `refresh_rules` 里的防污染规则。
- 能恢复旧日志中的真实记录。

代价：

- 实现更复杂。
- 需要精准搜索历史日志。
- 需要缓存保护，防止快速刷新覆盖完整结果。

当前判断：

这是目前最符合实际数据的方案。

## 方案 E：同步精准刷新覆盖缓存

来源：

- 2026-05-04 对 `xm-20779/xm-20782/xm-20787/xm-20791` 的前端手动刷新问题复盘。

时间：

- 2026-05-04 20:55

触发场景：

- 用户点击右侧或操作列的 `↻` 刷新按钮。

核心规则：

1. 刷新按钮不再只做轻量扫描，也不应先把旧空缓存当成最终结果渲染。
2. 刷新必须重新从 Trae workspace 和历史日志拉取一次。
3. 后端按当前 `currentSessionId` 全局精准搜索：

```bash
rg 'create message, chat_session_id:\s*<sessionId>, message_id:' logs
```

4. 每条 create message 生成一条候选轮次。
5. `input_history` 只提供会话文本，按时间顺序和 create message 对齐。
6. 第二段优先用同 session、同轮、时间接近的 response/task id；找不到则退回 user message id。
7. 拉到真实 rows 后覆盖缓存。
8. 如果精准拉取结果为空，而旧缓存有真实 rows，保留旧缓存，不用空结果覆盖。

目标格式：

```text
.{userId}:{traceId}_{rawSessionId}.{responseOrTaskMessageId}.{chatMessageId}:Trae CN.T(createMessageTime)
```

保底格式：

```text
.{userId}:{traceId}_{rawSessionId}.{chatMessageId}.{chatMessageId}:Trae CN.T(createMessageTime)
```

为什么要从方案 D 调整到方案 E：

- 方案 D 的“前端快返 + 后台补全”会先渲染旧缓存。
- 如果旧缓存是空，用户会看到“暂无会话输入记录”，误以为刷新失败。
- 手动刷新在用户语义上就是“重新拉取并覆盖缓存”，不是“先展示旧缓存，后台慢慢补”。
- `xm-20791` 的截图证明：后台正在拉取时，弹窗仍显示旧空缓存，体验和判断都不对。

方案 E 的取舍：

- 牺牲一点刷新按钮等待时间。
- 换取结果准确、缓存立即覆盖、前端不显示假空。
- 批量刷新可继续排队执行，但单项刷新必须以准确覆盖为准。

当前判断：

方案 E 解决了“刷新时不能先显示旧空缓存”的问题，但还没有覆盖 `launchctl` 环境里 `rg` 丢失、`full` 与 `precise` 行数不一致、以及新结果比旧缓存更少时不应回退覆盖的问题。

## 方案 F：显式 `rg` 路径 + 双通道刷新取更多行

来源：

- 2026-05-05 对 `xm-20789` 的排查
- `solo-coder/workbench/serve_workbench.py` 当前实现

触发场景：

- 浏览器打开的 Workbench 由 `launchctl` 启动，而不是在交互式终端里直接运行。
- 终端里直接调用 Python 函数能拿到 3 条，HTTP 刷新接口却只返回 2 条。

根因：

- 交互式终端的 PATH 能找到 `rg`，`extract_trae_session_rounds_precise()` 可用。
- `launchctl` 启动的服务 PATH 不完整，`shutil.which('rg')` 或 PATH 依赖方案会失效。
- 结果是 HTTP 进程里 `precise=0` 或 `precise<full`，导致第一轮或旧轮次被漏掉。

当前代码落地规则：

1. `rg` 不再只依赖 PATH，而是显式尝试这些固定候选路径：

```text
/opt/homebrew/bin/rg
/usr/local/bin/rg
/usr/bin/rg
.../codex.../vendor/.../rg
```

2. 刷新时同时运行两条路径：

- `full`：`extract_trae_session_rounds(... allow_full_scan=True)`
- `precise`：`extract_trae_session_rounds_precise(...)`

3. 两条路径都成功时，先取行数更多的一方作为刷新结果；如果行数相同，则比较 composite 质量，优先保留第二段为真实 response/task message id 的结果，而不是 `chatMessageId.chatMessageId` 保底结果。
4. 如果新结果行数少于已有缓存行数，不允许覆盖旧缓存。
5. 如果新结果是 0 行，而旧缓存已有真实 rows，也不允许用 0 行覆盖。
6. 缓存保护只防止“真实 response/task message id 被保底结果降级”，不能阻止旧保底缓存升级为真实 response/task message id。
7. `Trae CN.T(...)` 时间统一收敛到：

```text
create message 日志时间 > chatMessageId ObjectId 时间 > task/response ObjectId 时间
```

不再允许用刷新时刻兜底写时间。

`xm-20789` 的直接收益：

- 终端直接调用：3 条
- GET 读缓存：3 条
- POST 刷新接口：3 条

不再出现“GET 是 3 条、POST 刷新又刷回 2 条”的分裂状态。

`may-979` / `may-980` 的补充结论：

- 这两个样本中 `full` 路径能找到 create message、trace 和 chat message，但第二段会退回 `chatMessageId.chatMessageId` 保底格式。
- `precise` 路径能从同 trace、同 session、同轮日志中找到真实 task/response message id。
- 因为 `full` 与 `precise` 都只有 1 条，旧的“只看行数”选择规则会继续保留保底格式，导致前端 Session 列看起来仍然失败。
- 当前代码已改为“行数优先、质量次之”：同条数时，`responseOrTaskMessageId.chatMessageId` 胜过 `chatMessageId.chatMessageId`。
- 旧缓存若是保底格式，后续刷新允许被真实 task/response id 覆盖；旧缓存若已经是真实 task/response id，后续刷新不能用保底格式覆盖。

## 核心分歧：第二段到底是什么

| 方案 | 第二段 | 优点 | 风险 |
|---|---|---|---|
| `responseMessageId.chatMessageId` | 响应/任务/前端消息 id | 更贴近真实 Trae UI 链路 | 找错会错配 |
| `userMessageId.userMessageId` | 用户 create message id | 稳、简单、不易污染 | 会丢失真实 response/task id |
| 当前折中 | 有真实 response/task id 就用，否则退回 userMessageId | 兼容真实样本和保底规则 | 需要更严格的校验 |

最终取舍：

- 时间和 trace 必须以 `create message` 为准。
- 第二段可以是 response/task id，但必须是真实同轮数据。
- 找不到第二段时，才退回 userMessageId。
- 已有真实 composite 不能被退化结果覆盖。

## 核心分歧：时间来源

| 时间来源 | 是否采用 | 说明 |
|---|---|---|
| ai-agent `create message` 时间 | 采用 | 主标准 |
| response/task ObjectId 内嵌时间 | 只可兜底 | 不能优先覆盖 create message |
| renderer 展示时间 | 不作为主时间 | 通常晚于用户输入 |
| 刷新时间 | 禁止 | 会造成缓存时间污染 |

最终取舍：

```text
create message 时间 > 用户消息 ObjectId 兜底 > 不写该行
```

## 核心分歧：日志扫描范围

早期轻量方案：

- 只扫最近日志。
- 优点是前端不卡。
- 缺点是会漏 `20260501/20260503` 等老日志。

精准历史方案：

- 先拿 `currentSessionId`。
- 再全局精准搜：

```bash
rg 'create message, chat_session_id:\s*<sessionId>, message_id:' logs
```

- 优点是能恢复老记录。
- 缺点是单次可能慢。

最终取舍：

- 前端刷新可以轻量返回旧缓存。
- 后端补全必须支持精准历史搜索。
- 精准搜索要有队列和缓存保护，不能卡死页面。

## 核心分歧：空 rows 是否可信

空 rows 可信的情况：

- 无 workspace。
- 无 currentSessionId。
- 无 create message。
- 无真实 trace。

空 rows 不可信的情况：

- 只是最近日志没扫到。
- 只查了 ChatStore，没有查 create message。
- 只查了 session 级 tool/snapshot，没有查用户消息行。
- 后台刷新 pending 时返回了旧空缓存。

最终取舍：

任何 0 行结论，都必须先做精准 create-message 搜索。

## 当前推荐方案

推荐采用“方案 F：显式 `rg` 路径 + 双通道刷新取更多行 + 行数保护”。底层仍是“create-message 主链路 + response/task id 受控补齐”：

```text
.{userId}:{traceId}_{rawSessionId}.{responseOrTaskMessageId}.{chatMessageId}:Trae CN.T(createMessageTime)
```

保底：

```text
.{userId}:{traceId}_{rawSessionId}.{chatMessageId}.{chatMessageId}:Trae CN.T(createMessageTime)
```

硬规则：

- 不写 `missing_trace`。
- 不写短 id。
- 不复用 trace。
- 不用刷新空结果覆盖旧缓存。
- 不用 renderer 时间覆盖 create message 时间。
- 不把旧日志漏扫当成没有记录。
- 手动刷新必须重新拉取并覆盖缓存。
- 前端不能在刷新中把旧空缓存当成最终结果展示。
- 不能依赖 `launchctl` 的 PATH 去找 `rg`。
- `full` 与 `precise` 行数冲突时，优先保留更多行的一侧。
- 新结果条数少于已有缓存时，不允许回退覆盖。

## 需要继续验证的样本

| 样本 | 预期 |
|---|---|
| `xm-12232` | 3 条，第一条 `2026/5/3 17:06:37`，无 missing_trace |
| `xm-12239` | 3 条，前端和 8090 接口一致 |
| `xm-20768` | 3 条，第三条保留真实 response/task id |
| `xm-12245` | 3 条，来自老日志 create-message |
| `xm-12246` | 3 条，不能再误判 0 |
| `xm-12253` | 3 条，不能再误判 0 |
| `xm-20779` | 3 条，手动刷新后不能显示旧空缓存 |
| `xm-20782` | 3 条，来自历史 create-message |
| `xm-20787` | 3 条，来自历史 create-message |
| `xm-20791` | 1 条，手动刷新后不能显示旧空缓存 |
| `xm-20789` | 3 条，GET/POST/终端调用一致，不能再出现 2/3 条分裂 |
