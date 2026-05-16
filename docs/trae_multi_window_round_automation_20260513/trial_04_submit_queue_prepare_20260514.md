# 试跑 04：提交队列与安全准备首项

时间：2026-05-14

## 本次目标

在“探测 -> 安全运行态启动 -> 浏览器验收 -> 反馈草稿”之后，补上进入 Trae UI Operator 前的队列层：

```text
next_prompt_drafts.json
-> submit_queue.json
-> 串行待提交项目
-> 准备队列首项
```

本阶段仍然不自动粘贴、不点击运行。

## 新增能力

### 1. 提交队列生成

新增脚本：

```text
solo-coder/workbench/automation/trae_submit_queue.py
```

输入：

```text
docs/data/generated/automation_probe/<group>/next_prompt_drafts.json
docs/data/generated/automation_probe/<group>/probe.json
docs/data/generated/automation_probe/<group>/runtime_start_report.json
```

输出：

```text
docs/data/generated/automation_probe/<group>/submit_queue.json
docs/data/generated/automation_probe/<group>/submit_queue.md
```

队列规则：

```text
1. 只有 favicon.ico、React Router future warning、React DevTools 这类低价值问题时跳过。
2. 页面白屏、正文为空、根组件未渲染、工程入口缺失、无运行态等问题判为 high。
3. 请求失败、外链资源失败、媒体加载失败、接口异常等问题判为 medium。
4. 排序按 priority/score，从高到低串行处理。
```

### 2. Workbench 按钮

新增按钮：

```text
Trae 多轮自动化 -> 生成提交队列
Trae 多轮自动化 -> 准备首项
```

新增 API：

```text
POST /api/trae-round-automation-submit-queue
POST /api/trae-round-automation-prepare-submit
```

`准备首项` 行为：

```text
1. 读取 submit_queue.json。
2. 选择队列首项。
3. 将该项 prompt 写入 macOS 剪贴板。
4. 聚焦匹配的 Trae 窗口。
5. 不自动粘贴。
6. 不点击运行。
```

这样可以先验证队列顺序、窗口定位和剪贴板内容，不会直接影响 Trae 对话轮次。

## 第 13 组验证结果

执行：

```bash
python3 solo-coder/workbench/automation/trae_submit_queue.py \
  --group 'may-4776-may-4779-第13组'
```

结果：

```text
queued: 3
skipped: 1
high: 2
medium: 1
normal: 0
```

待提交顺序：

```text
1. may-4777 [high]
   页面 HTTP 200 但正文没有可见文本，疑似根组件未渲染、路由空挂载或页面白屏。

2. may-4779 [high]
   未发现 frontend/package.json 和 backend/package.json，前后端工程入口缺失或目录结构不标准。

3. may-4778 [medium]
   视频外链 https://www.w3schools.com/html/mov_bbb.mp4 多次 net::ERR_ABORTED，核心媒体资源依赖不可控外链。
```

跳过：

```text
may-4776
原因：只有 favicon.ico 404 这类低优先级静态资源问题。
```

## API 验证

提交队列：

```text
POST /api/trae-round-automation-submit-queue
ok=True
queue=[may-4777, may-4779, may-4778]
skipped=[may-4776]
```

准备首项 dry-run：

```text
POST /api/trae-round-automation-prepare-submit
dryRun=True
ok=True
order=may-4777
priority=high
clipboardWritten=False
promptLength=525
```

说明：dry-run 只验证队列首项，不写剪贴板、不聚焦窗口。

## Workbench 状态

Workbench 已重启：

```text
http://127.0.0.1:8090/index.html
http://127.0.0.1:8091/index.html
```

前端版本：

```text
app.js?v=113
```

## 下一步

下一步是 UI Operator 的第二段：在已经聚焦目标窗口、prompt 已进入剪贴板的前提下，识别 Trae 当前输入区状态。

建议顺序：

```text
1. 先对 may-4777 做单窗口试验。
2. 只做 AX 树探测，找到输入框、运行按钮、继续按钮、确认按钮等可访问元素。
3. 如果能稳定定位输入框，再做“粘贴但不运行”。
4. 如果粘贴稳定，再做“粘贴 + 点击运行”。
5. 每次运行后刷新 session/log trace/screenshot，并判断是否进入下一轮。
```

仍然不要直接并发操作 12-16 个 Trae 窗口。UI Operator 继续保持单通道。
