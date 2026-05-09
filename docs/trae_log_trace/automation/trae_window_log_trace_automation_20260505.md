# Trae 自动化方案

更新时间：2026-05-05

## 目标

为 Workbench 增加一套可复用的 Trae 窗口自动化能力，用序号 `xm-xxxxx` 定位正在运行的 Trae 编译器窗口，并在窗口内执行受控动作。

当前优先目标是获取每轮对话下方按钮组里的第三个按钮结果，也就是“复制日志轨迹”按钮复制到剪贴板的内容。

## 已验证能力

1. macOS 系统进程里 Trae CN 的窗口进程名不是 `Trae CN`，而是 `Electron`。
2. Trae 窗口标题包含项目序号，例如：

```text
OrderDetail.vue — xm-20791
Index.vue — xm-23137
mock.controller.js — xm-20789
database.js — xm-20793
```

3. 可以通过 AppleScript / System Events 按窗口标题匹配 `xm-xxxxx`。
4. 可以对匹配窗口执行：

```text
focus       置顶窗口
scroll-up   PageUp
scroll-down PageDown
```

5. Workbench 已增加后端接口：

```text
POST /api/trae-window-action
```

请求示例：

```json
{"order":"xm-20791","action":"focus"}
{"order":"xm-20791","action":"scroll-down"}
{"order":"xm-20791","action":"scroll-up"}
```

6. Workbench 已增加日志轨迹按钮验证接口：

```text
POST /api/trae-copy-log-trace
```

请求示例：

```json
{"order":"xm-20791","mode":"probe"}
{"order":"xm-20791","mode":"click"}
{"order":"xm-20791","mode":"collect","scan":"scroll","maxPages":12}
```

`probe` 只定位按钮，不点击；`click` 会先写入剪贴板哨兵值，再点击目标按钮并读取剪贴板；`collect` 默认使用 `scan:"scroll"`，先向上翻到对话区较早位置，再逐屏向下扫描，把每屏可见的 `copy-all` 逐个点击并按剪贴板内容去重。

## 当前窗口样本

```text
xm-20791 -> OrderDetail.vue — xm-20791
xm-23137 -> Index.vue — xm-23137
xm-20789 -> mock.controller.js — xm-20789
xm-20793 -> database.js — xm-20793
```

## 日志轨迹按钮目标

用户观察到每个序号项目通常进行三轮对话。每轮对话完成后，消息区域会出现 4 个按钮。目标按钮是第 3 个按钮：“复制日志轨迹”。

已确认的 DOM 结构特征：

```html
<button
  type="button"
  class="icd-btn copy-all icd-btn-default icd-btn-small icd-btn-icon-only"
  aria-disabled="false"
  aria-label="复制全部"
  data-icubetooltip="复制全部"
  data-icubetooltip-position="bottom">
  <span aria-hidden="true" class="codicon codicon-icube-Copy" role="button"></span>
</button>
```

自动化定位应优先匹配按钮本体，而不是图标 `span`：

```text
button.copy-all[aria-label="复制全部"]
button.copy-all[data-icubetooltip="复制全部"]
```

映射到 macOS Accessibility 时，优先看：

```text
AXRole == AXButton
AXDOMClassList contains copy-all
AXDescription / AXTitle / AXHelp contains 复制全部
```

注意排除任务卡片复制按钮：

```text
AXDOMClassList contains task-copy-btn
```

这类按钮是“复制任务信息”，不是日志轨迹复制。

预期自动化流程：

1. 根据 `order` 聚焦 Trae 窗口。
2. 先向上翻到对话区较早位置，再逐屏向下扫描。
3. 找到每屏回复下方的按钮组；每轮对话都有自己的一组按钮，三轮对话通常会有三个可采集的日志轨迹按钮。
4. 点击第 3 个按钮，或在 `collect` 模式下逐个点击所有可见 `copy-all`，跨页面按剪贴板内容哈希去重。
5. 读取 macOS 剪贴板。
6. 校验剪贴板内容是否为完整 Trae 日志轨迹。
7. 写入 Workbench 的 `data/generated/trae_session_rounds/<order>.json` 或提供给刷新逻辑合并。

## 方案分层

### 方案 A：可访问性树点击

优先方案。

通过 System Events 查询 `Electron` 窗口内的 UI element / button。优先按 `copy-all + 复制全部` 定位；如果当前窗口只显示局部对话，则先滚动窗口再查找，必要时按每轮按钮组顺序取第 3 个。

优点：不依赖固定坐标，窗口移动后仍可用。

风险：Electron/Chromium WebView 的按钮可能不暴露完整 accessibility 名称。

### 方案 B：坐标点击

兜底方案。

通过窗口位置和截图布局定位消息卡片右下方按钮组，点击第 3 个按钮。

优点：只要视觉布局稳定就能点。

风险：窗口缩放、滚动位置、主题或消息高度变化会导致坐标偏移。

### 方案 C：日志反查

当前 sessionId 生成逻辑已有的方案。

通过 workspace db + Trae ai-agent 日志中的 `create message` 生成轨迹。此方案不依赖 UI，但有些 UI 内的“复制日志轨迹”可能包含更准确的 response/task id，因此仍需要 UI 按钮方案补强。

## 下一步验证清单

1. 用 `xm-20791` 聚焦窗口。
2. 先向上翻，再逐屏向下扫，确认三轮对话都能暴露到视口。
3. 使用 `copy-all + 复制全部` 定位按钮，而不是按图标坐标猜测。
4. `collect` 模式下把每屏可见的 `copy-all` 都点一遍并去重。
5. 用 `pbpaste` 读取剪贴板结果。
6. 校验剪贴板内容是否是日志轨迹，不是任务信息或普通回复内容。

当前验证结论：

```text
POST /api/trae-copy-log-trace {"order":"xm-20791","mode":"probe"}
visited=30000
matched=false
```

原因：当前 `xm-20791` 可见区域暴露的是任务卡片和项目预览区，AX 树里能命中 `task-copy-btn`（复制任务信息），没有命中 `copy-all` / `复制全部`。这说明单屏扫描不够，必须先滚动把对话轮次按钮带进视口，再做点击或 collect。

接口：

```text
POST /api/trae-copy-log-trace
```

请求：

```json
{"order":"xm-20791","mode":"collect","scan":"scroll","maxPages":12}
```

返回：

```json
{"ok":true,"order":"xm-20791","traces_count":3,"trace":"..."}
```

## 硬规则

- 不写 `missing_trace`。
- 不伪造日志轨迹。
- 不用短 sessionId 替代完整 composite。
- UI 点击拿不到时，要返回明确错误，不覆盖已有缓存。
- 自动化动作必须先聚焦目标序号窗口，不能误点其他 Trae 窗口。
