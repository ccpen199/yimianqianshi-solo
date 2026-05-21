# Trae 会话刷新排错记录

## 不可破坏的 sessionId 规则

1. 缓存行只能写真实 composite sessionId：
   `.userId:traceId_sessionId.userMessageId.taskMessageId:Trae CN.T(createMessageTime)`。
2. 优先使用用户消息的 `create message, chat_session_id, message_id` 行。
3. 后续 tool、snapshot、renderer 行只允许补 trace 或 task 信息，不能覆盖用户消息创建时间。
4. 找不到真实 32 位 `trace_id` 或用户 messageId 时，不写 `missing_trace`，不复用其他轮次 trace，不造假 composite。
5. 新刷新结果为空时，不覆盖已有真实缓存。

## 本次链路问题

`refresh_trae_session_cache()` 使用 `deadline=None` 本身不违背规则，因为“不设超时”符合一直拉取的要求；问题在于 `/api/refresh-trae-session-rounds` 之前会等待 `future.result()` 完成，导致前端请求被阻塞，页面看起来像卡住。

## 当前优化

1. 后台刷新任务仍继续执行，不中断真实日志拉取。
2. 接口如果发现任务仍在运行，立即返回当前缓存，并带上 `refreshPending=true`。
3. 前端收到 `refreshPending` 后保持按钮加载态，显示“正在后台拉取”，并定时轮询同一个刷新接口。
4. 任务完成后前端再显示刷新完成；若仍没有真实 create message 和 trace，则保持空 rows，不写 miss。
5. 精准日志搜索不再依赖 `launchctl` 的 PATH，后端会显式尝试固定 `rg` 路径。
6. 刷新时同时跑 `full + precise` 两条路径，取行数更多的结果。
7. 新结果行数少于已有缓存时，不允许覆盖旧缓存；避免 3 条被刷回 2 条。
8. 行数相同但 `precise` 找到真实 response/task message id 时，必须用 `precise` 覆盖 `userMessageId.userMessageId` 保底结果。
9. 缓存保护只防止真实 response/task id 被降级，不阻止保底缓存升级成真实 response/task id。
10. 前端单项 `↻` 刷新必须发送 `force=true, discover=true`，直接走深扫重拉，不再因为已有缓存而只做 `identityOnlyRefresh`。
11. 如果同一序号队列槽里有已完成旧任务，新的一次 `force=true` 请求必须丢弃旧 future 并启动本次新任务；旧结果只能被轮询请求领取，不能吞掉新的手动刷新。

## 队列语义

- 手动刷新：`POST /api/refresh-trae-session-rounds {"order":"may-4837","force":true,"discover":true}`，启动深扫重拉。
- 轮询刷新：`force=false`，只领取正在运行或刚完成的同一任务结果，不创建新任务。
- 已完成旧任务遇到新的手动刷新时，不返回旧结果；后端先清掉旧任务槽，再按本次参数创建新 deep scan。
- 深扫结果写同一个项目缓存文件。它不是追加文件，而是重建 rows 后覆盖缓存；但空结果或更少结果不能覆盖已有有效缓存。
- 批量会话查看只读缓存，不触发刷新；“刷新未达标项目”复用同一刷新接口，但也必须走 `force=true, discover=true` 的深扫重拉语义，不能退回 `identityOnlyRefresh`。

## 典型判断

- 有 `input_history` 但没有 `ChatStore.turnsHeight` 和 create message：只能说明有输入文本，不能组成规范 sessionId。
- 日志里只有 session 级 tool/snapshot trace：不能作为用户轮次 sessionId。
- 前端长时间没反馈：优先查刷新接口是否在等后台 future，而不是先改 sessionId 规则。
