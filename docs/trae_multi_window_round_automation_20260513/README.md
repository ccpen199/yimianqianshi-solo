# Trae 多窗口多轮对话自动化规划

更新时间：2026-05-16

## 目标

当前 Workbench 已经具备批量会话列表、日志轨迹、截图列、不满意列和飞书粘贴等能力，最后一个痛点是：同时打开 12-16 个 Trae CN 编译器窗口时，希望系统能辅助完成每个项目 5-6 轮对话。

每一轮可能出现以下情况：

- 任务正常完成，需要进入下一轮。
- 任务中断、失败或卡住，需要退回重试。
- 本轮产物已经明显不可用，需要暂停并直接进入下一轮反馈。
- 需要根据上一轮会话、日志轨迹、当前运行的前端地址/API、浏览器截图判断问题。
- 需要在 Trae 窗口中点击确认、运行、继续、复制日志轨迹等按钮。
- Trae 窗口分布在不同 macOS 虚拟桌面，前台焦点、剪贴板、鼠标和辅助功能都不是可并行资源。

因此目标不是一次性让 12-16 个 Trae 窗口同时被点击，而是建立一套“并行分析、串行操作、状态可恢复”的调度体系。

## 2026-05-15 目标校准

多轮自动化的核心不是单纯“找到 Trae 输入框并粘贴”，而是替代批量会话列表里的手工工作流。

人工工作流实际是：

```text
第 N 轮手动输入 prompt
-> Trae 生成代码和过程日志
-> 刷新批量会话列表
-> 根据第 N 轮会话、日志轨迹、截图、下一轮验收反馈生成不满意列
-> 人工判断第 N+1 轮应该继续追问什么
-> 再手动输入第 N+1 轮 prompt
```

自动化工作流必须改成：

```text
读取批量会话列表现有行
-> 判断每个序号当前已有有效轮次
-> 如果已达到目标轮次，停止
-> 如果未达到目标轮次，读取该序号最后一轮有效行
-> 使用上一轮会话 + 不满意列 + 日志轨迹 + 结果截图 + 当前前端/API 状态
-> 生成下一轮要投给 Trae 的 prompt
-> 串行聚焦对应 Trae 编译器窗口
-> Cmd+U 聚焦 SOLO 输入框
-> 粘贴下一轮 prompt，并把上一轮问题页截图作为图片附件粘贴进同一个会话框
-> 确认文本和截图附件都已进入输入框后再运行
-> 等待完成后刷新该序号会话列表
```

因此，`submit_queue.json` 不能长期只依赖浏览器检查草稿。后续队列应升级为“轮次输入队列”，优先从批量会话缓存生成。

## 全局目标轮次

Workbench 里出现的以下数字必须表示同一件事：

```text
批量会话弹窗：最低记录数
首页自动检测：目标轮次
多轮自动化：目标轮次
复制列限制：每个序号最多复制前 N 轮
自动化调度：每个序号最多输入 N 轮
```

默认值当前统一为：

```text
DEFAULT_TARGET_ROUNDS = 5
```

规则：

- 每个序号只统计有效会话行，读取失败、空 session、空 conversation 不计入。
- 每个序号初始状态都是 `nextRoundIndex=1`。首轮没有上一轮会话、不满意列或日志轨迹，不允许因此触发深扫等待。
- 首轮输入必须直接来自数据列表原始业务 prompt；如果找不到原始 prompt，只记录 `nextRoundIndex=1` 并跳过提交，避免把无意义文本塞进 Trae。
- 如果某序号已有轮次数 `>= DEFAULT_TARGET_ROUNDS`，不再生成下一轮输入。
- 如果某序号已有轮次数 `< DEFAULT_TARGET_ROUNDS`，才进入待提交队列。
- 如果页面输入框手动改成 6，所有模块都应按 6 轮执行和复制。
- 目标轮次是“最多输入 N 轮”，不是“必须永远生成到 N 轮”。遇到人工标记暂停、工程缺失、登录失效、窗口不可控时进入人工队列。

## 轮次绑定规则

批量会话列表的行语义必须固定：

```text
第 N 行 conversation：第 N 轮投给 Trae 的输入
第 N 行 logTrace：第 N 轮 Trae 的执行过程和输出轨迹
第 N 行 dissatisfactionReason：对第 N 轮产物和过程的不满意结论
第 N 行 screenshots：已经前移后的第 N 轮结果截图
第 N+1 行 conversation：通常是人工对第 N 轮结果的验收反馈，已被用于生成第 N 行不满意列
```

生成第 N+1 轮 prompt 时，优先读取第 N 行：

```text
lastConversation = 第 N 行 conversation
lastDissatisfaction = 第 N 行 dissatisfactionReason
lastLogTrace = 第 N 行 logTrace
lastScreenshots = 第 N 行 screenshots
currentRuntime = 当前前端/API/console/network/截图检查结果
```

如果出现连续重复会话、重试或中断，必须先折叠：

- 相同 conversation 的连续轮次，只保留最后一个有完整 session/logTrace 的轮次作为当前轮。
- 相同 conversation 即使是撤回、错误重试或重新提交，也只能算一个业务轮次，不能把重复行计成多轮。
- Trae `input_history` 中如果出现相同文本 + 相同截图的重复提交，即使中间夹了重复 PRD、空转或 UI 回放，也按同一轮处理，只保留最后一次提交。
- 旧版 `submit_queue.json` 或浏览器探测草稿生成的内部自动化 prompt 不算业务轮次，尤其是包含“已核对到的证据 / 需要优先修复的问题 / 请按以下顺序处理”的模板文本，必须在会话拉取时过滤，不能进入批量会话列表。
- 会话列表刷新必须先用 workspace DB / input_history 快速恢复轮次数；日志轨迹深扫只能作为后续补全，不能阻塞前端列表显示当前轮次。
- 前两轮被淘汰、第三轮成功的情况，只取最后成功轮继续往下走。
- 如果一轮明显只是“模型请求失败/请稍后重试/任务中断”，不把它当作有效业务轮次；它只作为过程风险记录。

## 下一轮 Prompt 生成规则

投给 Trae 的下一轮 prompt 必须像人工验收反馈，只写当前轮能复核的事实，不写空行分隔，不写“本轮依据/执行边界/当前验收只覆盖首屏”这类模板块，不摘抄首页大段文案。

固定内容压缩为 1 行：

```text
第二轮：选择学生身份并点击“确认进入”后，页面显示“加载失败”，没有进入学生端首页。
```

首轮后的第 2 轮要特殊处理：第 2 轮是在反馈第 1 轮结果，文本只允许写“第二轮：具体点击后出现的一个页面问题”。不能写“第 1 轮是首轮交付”“总目标最多 5 轮”“本轮修复”“复验输出”“端口安全”等系统约束。

生成要求：

- 优先使用当前可复现证据：问题页截图、页面可见错误、点击路径。
- 如果 `dissatisfactionReason` 已有人写结论，必须作为主线；但当前浏览器复验发现更明确的页面错误或接口失败时，要以当前复验事实覆盖泛化表述。
- 每次只写一个问题，优先写前端页面可见问题；接口和 console 只作为内部定位依据，除非页面没有可见错误。
- 禁止输出“页面可以打开但只覆盖首屏”“还没有证明核心链路”“当前已有浏览器截图但缺少证据”等套话；必须指出哪个页面、点击哪个按钮后出现什么问题。
- 控制台噪音要过滤，例如 favicon、React Router future warning、React DevTools、antd message warning；只保留会导致页面不可用的错误作为备用问题来源。
- 不要把上一轮完整 PRD 大段塞回 prompt；业务目标最多保留一句，且只有在缺少运行态证据时使用。

## 问题页截图规则

浏览器验收截图不能默认只截首页。截图 Worker 必须读取当前轮的不满意结论、待提交 prompt 或最后一轮会话文本，并按问题关键词尽量进入对应页面后再截图：

- 出现“个人中心、我的、账号、用户中心、我听、收藏、订阅、历史”，优先点击“我的/个人中心/账号”等入口。
- 出现“搜索、查询、筛选”，优先进入搜索/发现页，并在可见搜索框里输入短测试词触发结果页。
- 出现“后台、管理端、运营”，优先进入运营后台或管理入口。
- 出现“购买、下单、订单、购物车、提交、支付”，优先进入商品/购买/订单相关页面。
- 出现“详情、播放、视频、文章、专辑、声音、问答”，优先点击列表卡片或详情/播放入口。

如果问题页入口找不到，报告里必须记录“未命中问题页”，截图仍保留当前页面，但下一轮 prompt 要把“缺少对应入口/路由，截图没有命中问题页”写成产物问题。报告字段统一包含 `targetReason`、`targetMatched`、`targetActions`、`finalUrl` 和最终页面正文摘要，避免只凭首页首屏误判。

## 截图随下一轮提交规则

上一轮浏览器验收完成后，截图不仅用于 Workbench 表格和飞书列，也必须作为下一轮 Trae 会话的图片附件一起提交。这样 Trae 在第 N+1 轮能直接看到第 N 轮页面真实表现，而不是只读文字描述。

提交顺序固定为：

```text
读取轮次输入队列
-> 找到该序号最近一次浏览器报告里的 screenshotPath
-> 聚焦目标 Trae 窗口
-> Cmd+U 聚焦 SOLO 输入框
-> 粘贴文字 prompt
-> 把 screenshotPath 对应 PNG 写入 macOS 剪贴板
-> Cmd+V 粘贴图片附件
-> 只有文本长度有效且 imagePasted=true 时，才允许 Enter 运行
```

行为要求：

- 如果存在上一轮截图，`fast-submit` 必须把它当作必需附件；截图粘贴失败时，本轮提交状态必须置为 blocked，不能继续按“已提交”处理。
- 如果当前项目服务已经关闭，无法重新截图，可以使用最近一次已经生成的有效截图作为附件，但报告和事件日志要保留截图路径。
- Prompt 文本里不写截图文件名、不写“已附截图”。截图只作为 Trae 输入框里的图片附件存在。
- 事件日志必须记录 `screenshotPath`、`screenshotIncluded`、`imagePasted`，便于后续判断某一轮是否真正带图提交。
- 没有截图时可以只提交文字，但不能伪造截图状态；后续浏览器验收仍需补截图。

## 核心结论

### 1. Trae GUI 操作不能安全并行

Trae CN 是 Electron 应用，窗口操作依赖 macOS Accessibility、AppleScript、系统前台焦点、键盘、鼠标和剪贴板。它们天然是单通道资源：

- 同一时间只有一个前台窗口能稳定接收输入。
- 不同虚拟桌面的窗口可能无法被当前 AX 扫描稳定枚举。
- 剪贴板只有一份，多个任务同时写剪贴板会互相覆盖。
- 同时点击多个 Trae 窗口容易误点、错窗口、错轮次。

结论：Trae 窗口点击、粘贴 prompt、点运行/确认、官方复制按钮这类动作必须由一个串行 UI Operator 执行。

### 2. 非 UI 工作可以并行

以下任务不需要触碰 Trae 前台窗口，可以并行：

- 读取 Workbench 批量组和项目列表。
- 读取 Trae CN 本地 workspace DB、Modular 日志、输入历史和截图资源。
- 刷新 sessionId、日志轨迹、截图列、不满意列。
- 读取项目目录、package.json、.env、vite.config、后端入口。
- 判断前后端端口、监听进程和进程归属。
- 通过 HTTP 探测本地 API 和前端页面。
- 用浏览器自动化打开前端地址、抓截图、收集 console error、network failure。
- 生成下一轮反馈 prompt 草稿。

结论：非 UI Worker 可以并发 4-8 个；UI Operator 保持并发 1。

## 推荐架构

```text
Batch Orchestrator
  -> Project Queue
  -> Parallel Non-UI Workers
       - Session/Log Worker
       - Runtime Probe Worker
       - Browser Screenshot Worker
       - Issue Analysis Worker
       - Prompt Draft Worker
  -> Serialized Trae UI Operator
       - focus window
       - paste prompt
       - click run/confirm/continue
       - wait for completion signal
  -> Refresh & Merge
       - refresh session rows
       - collapse retry duplicates
       - shift screenshots
       - update Workbench table
```

### 并行层

并行层负责“看、读、判断、生成”，不负责点击 Trae。

输入：

- 批量组名，例如 `may-4776-may-4779-第13组`
- 每个序号项目目录
- 当前已有轮次数据
- Trae 本地日志与 workspace DB
- 项目端口配置和运行状态

输出：

- 每个项目当前轮次状态
- 前端/API 是否可访问
- 页面截图
- console/network 错误
- 需要提交给 Trae 的下一轮 prompt
- 是否需要重试、跳过、暂停

### 串行 UI Operator

UI Operator 负责“对 Trae 做动作”，一次只处理一个窗口。

动作包括：

- 根据窗口标题匹配 `may-xxxx`。
- 聚焦 Trae 窗口。
- 检查是否在等待输入、运行中、需要确认、已完成。
- 粘贴下一轮 prompt。
- 点击运行/确认/继续。
- 必要时点击复制日志轨迹按钮。
- 操作完成后释放前台控制权。

## 状态机

每个项目维护独立状态：

```text
queued
-> probing
-> need_start_runtime
-> runtime_ready
-> browser_checked
-> prompt_ready
-> waiting_ui_submit
-> trae_running
-> web_verified
-> refresh_sessions
-> round_done
-> next_round
```

完成判断分成两条线，避免把“有日志/有 session”误当成成功：

- 真实轮次线：以 Trae 会话缓存、workspace DB 和 `create message` 作为轮次依据，只用于最终校准轮次，不直接代表任务已经完成。
- 快速完成线：某轮提交后，下一次巡检只要能打开该项目网页地址并成功生成截图，就认为本轮运行已具备进入下一轮的条件。

快速完成线不等待固定 10 秒或 20 秒静默窗口。调度器提交一个序号后立即切换到下一个序号；再次轮到该序号时做网页访问和截图验收。若误判为完成但下一轮没有实际输入成功，后续真实轮次检测仍会停留在原轮次，调度器会继续按当前轮次处理，不会污染 Trae 会话数据。

快速完成线只写入 `docs/data/generated/automation_round_state.json` 的乐观状态，不写入 `trae_session_rounds/*.json`。也就是说，它可以让调度器先生成下一轮输入，但不会伪造会话列、日志轨迹或截图列里的真实数据。

异常状态：

```text
missing_project
missing_frontend
missing_backend
port_conflict
runtime_start_failed
frontend_blank
api_failed
trae_window_missing
trae_waiting_confirm
trae_interrupted
retry_duplicate
manual_review_required
```

## 测试组观察

补充试跑记录：

```text
trial_01_may_4776_4779_group13.md
trial_02_after_reset_20260514.md
trial_03_runtime_start_group13_20260514.md
trial_04_submit_queue_prepare_20260514.md
trial_05_ax_probe_before_submit_20260514.md
```

`trial_02_after_reset_20260514.md` 是数据重置后的最新复检结论：探测脚本已补充 IPv6 loopback 识别，`may-4776` 前端实际可通过 `http://[::1]:24776/` 访问；第 13 组下一步应先补安全运行态启动器，再进入 Trae 串行 UI Operator。

`trial_03_runtime_start_group13_20260514.md` 已完成安全运行态启动试跑：`may-4776/4777/4778` 均可浏览器验收，`may-4779` 被识别为工程入口缺失；Workbench 页面新增“安全启动运行态”按钮。

`trial_04_submit_queue_prepare_20260514.md` 已完成提交队列试跑：`may-4777/4779/4778` 进入串行待提交队列，`may-4776` 因只有低优先级 favicon 问题被跳过；Workbench 页面新增“生成提交队列”和“准备首项”按钮。

`trial_05_ax_probe_before_submit_20260514.md` 已完成提交前 AX 探测：当前能返回窗口可见/不可见状态，但尚未稳定暴露 Trae 输入框和运行按钮，因此自动粘贴运行仍需先解决窗口可见性与输入区定位。

`trial_06_fast_keyboard_submit_20260515.md` 已完成快捷键提交试跑：`Cmd+U` 可把焦点切到 SOLO 输入框，快速提交接口会确认 `AXTextArea`、粘贴后读取文本长度，只有 `pastedLength > 0` 才按回车运行。该链路耗时约 2 秒，但提交内容下一步要从“浏览器草稿队列”升级为“批量会话轮次输入队列”。

当前已新增轮次输入队列：

```text
solo-coder/workbench/automation/trae_round_prompt_queue.py
POST /api/trae-round-automation-round-prompt-queue
Trae 多轮自动化 -> 生成轮次输入
```

快速提交会优先读取 `round_prompt_queue.json`；如果不存在或为空，再要求先生成队列，避免误用旧草稿。

测试组：

```text
may-4776-may-4779-第13组
```

对应项目：

```text
may-4776 移动直播打赏平台
may-4777 音乐私藏推荐系统
may-4778 短视频推荐娱乐平台
may-4779 短视频听歌扩展系统
```

已观察到的问题：

- `may-4776` 配置端口是后端 `14776`、前端 `24776`，但依赖未安装，不能直接访问。
- `may-4777` 后端端口是 `47771`，前端配置不完整，自动化不能假设 Vite 一定存在。
- `may-4778` 前后端依赖存在，端口为 `47781/47782`，可以作为首个运行态实验对象。
- `may-4779` 配置端口是 `47791/47792`，依赖未安装，需要先做项目内安全启动。
- shell 环境里可能存在全局 `PORT=3000`，会覆盖项目 `.env`，导致后端错误监听 3000。启动项目时必须显式注入项目端口，不允许继承外部 `PORT`。
- HTTP 探测本地地址时必须禁用代理，否则会出现 `relay failed to 127.0.0.1` 这类假失败。`curl` 使用 `--noproxy '*'`，Python 使用 `urllib.request.ProxyHandler({})`。
- macOS Spaces 会影响窗口枚举。窗口标题匹配可用，但不能作为唯一事实源，必须结合 Trae 日志和项目目录判断。

## 端口与启动安全

自动化启动项目必须遵守现有规则：

- 只检查当前项目配置的端口。
- 禁止 `killall node`、`pkill node`、批量杀全局端口。
- 若端口被占用，必须确认进程 cwd 或命令属于当前项目目录后才能停止。
- 无法确认归属时，改用本项目备用端口，并同步 `.env`、CORS、代理和访问地址。
- 启动前后端时必须显式传入项目端口，例如：

```text
PORT=47781 FRONTEND_PORT=47782 node server.js
vite --host 127.0.0.1 --port 47782
```

## 下一轮 Prompt 生成原则

生成给 Trae 的下一轮反馈时，必须引用本轮证据：

- 本轮用户输入/目标。
- 本轮日志轨迹中的文件修改、命令、验证步骤。
- 当前前端页面截图。
- 当前 API 探测结果。
- console error 和 network failure。
- 是否有白屏、空数据、按钮无响应、接口 500/404、端口错误。

不要只写泛化反馈，例如“功能不完整”“缺少验证”。需要写成可执行修复指令：

```text
当前前端 http://127.0.0.1:47782 可以打开，但推荐流接口返回 500，
页面重复渲染相同视频并出现 React key 重复告警。请优先修复 /api/videos/feed
返回结构和 Recommend.jsx 的 key 生成逻辑，然后重新启动 47781/47782，
用浏览器验证推荐页、搜索页和我的页均不白屏。
```

## 并发建议

默认并发：

```text
Runtime/API/File Worker: 6
Browser Screenshot Worker: 3
LLM Analysis Worker: 2-4
Trae UI Operator: 1
```

不建议把 Trae UI Operator 提高到 2 以上。除非未来为每个 Trae 实例隔离 OS 用户、独立显示会话、独立剪贴板和独立 user-data-dir，否则并行点击收益小，误操作风险高。

## 落地路线

### 第一阶段：只做探测与报告

新增脚本/接口：

```text
solo-coder/workbench/automation/trae_round_probe.py
GET/POST /api/automation/probe-round-group
```

能力：

- 输入批量组名。
- 输出项目路径、端口、依赖、窗口标题、监听状态、HTTP 状态。
- 禁用本地 HTTP 代理。
- 不启动项目、不点击 Trae。

### 第二阶段：项目运行态自检

新增能力：

- 仅启动当前项目的前后端。
- 生成运行日志。
- 用 Chrome/Playwright 打开页面截图。
- 收集 console/network 错误。
- 输出 `runtime_report.json` 和截图文件。

### 第三阶段：下一轮反馈草稿

新增能力：

- 读取本轮会话、日志轨迹、截图、运行报告。
- 生成下一轮 prompt 草稿。
- 标记 `retry`、`skip`、`manual_review_required`。
- 不自动提交 Trae。

### 第四阶段：串行 Trae UI Operator

新增能力：

- 聚焦目标 Trae 窗口。
- 粘贴 prompt。
- 点击运行/确认。
- 检测完成状态。
- 完成后触发日志轨迹和截图刷新。

### 第五阶段：5-6 轮调度闭环

新增能力：

- 对批量组设置目标轮次，例如 6。
- 每个项目独立推进。
- 重试轮次做近重复折叠，保留最后一次有效轮。
- 达标项目停止推进。
- 异常项目进入人工待处理队列。

## Workbench 页面建议

在首页增加“Trae 多窗口自动化”区域：

- 选择批量组。
- 设置目标轮次：5/6。
- 设置并行 Worker 数：3/6/8。
- 显示 UI Operator 状态：空闲/正在操作 may-xxxx/等待确认。
- 显示每个项目状态：探测中、运行中、需启动、需人工、已达标。
- 按钮：
  - 仅探测
  - 生成下一轮反馈
  - 串行提交到 Trae
  - 暂停调度
  - 跳过当前项目

## 验收标准

以 `may-4776-may-4779-第13组` 为第一组验收：

- 能生成四个项目的探测报告。
- 能正确识别 `may-4778` 的 `47781/47782` 已监听。
- 本地 HTTP 探测不受代理影响。
- 能识别 `may-4776/may-4779` 依赖未安装。
- 能识别 `may-4777` 前端结构不完整。
- 能为 `may-4778` 抓取浏览器截图和 console/network 错误。
- 不点击任何非目标 Trae 窗口。
- 不杀死任何非本项目端口进程。
- UI 操作队列始终单通道。

## 当前建议

先不要直接做全自动 5-6 轮。第一步应完成“探测报告 + 浏览器截图 + 下一轮反馈草稿”，确认质量后再接入 Trae UI Operator。

这能避免两个风险：

- 误点 12-16 个 Trae 窗口导致轮次错乱。
- 自动生成的反馈没有充分引用页面/API/日志证据，继续污染不满意列和会话顺序。
