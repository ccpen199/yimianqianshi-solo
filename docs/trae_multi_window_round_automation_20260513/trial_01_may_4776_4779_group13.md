# 试跑 01：may-4776-may-4779-第13组

时间：2026-05-13

## 执行范围

本次只执行规划文档中的安全试跑范围：

- 批量组运行态探测。
- 本地端口/API 探测。
- 单项目浏览器截图和 console/network 收集。
- 生成下一轮反馈草稿。

未执行：

- 未点击任何 Trae CN 窗口。
- 未自动向 Trae 提交下一轮 prompt。
- 未杀死任何 Node/Python/Vite 进程。
- 未改动飞书表格数据。

## 产物位置

```text
docs/data/generated/automation_probe/may-4776-may-4779-第13组/probe.json
docs/data/generated/automation_probe/may-4776-may-4779-第13组/may-4778-browser-report.json
docs/data/generated/automation_probe/may-4776-may-4779-第13组/may-4778-frontend.png
```

## 探测命令

```bash
python3 solo-coder/workbench/automation/trae_round_probe.py --group 'may-4776-may-4779-第13组'
```

浏览器检查：

```bash
node solo-coder/workbench/automation/trae_browser_runtime_check.js \
  --order may-4778 \
  --url http://127.0.0.1:47782/ \
  --out-dir 'docs/data/generated/automation_probe/may-4776-may-4779-第13组' \
  --wait-ms 4500
```

## 批量组探测结果

### may-4776

- 项目目录存在。
- 前端 package.json 存在。
- 后端 package.json 存在。
- 前端依赖未安装。
- 后端依赖未安装。
- 配置端口：后端 `14776`，前端 `24776`。
- 两个端口均未监听。
- HTTP 探测结果为 connection refused。

判断：当前不能直接进入浏览器验收，需要先按项目端口安全规则安装依赖并启动。

### may-4777

- 项目目录存在。
- 后端配置端口 `47771`。
- 前端推断端口 `47772`。
- 前端目录存在，但前端结构不完整，探测时未发现可直接启动的标准前端 package 配置。
- 端口 `47771/47772` 均未监听。

判断：需要优先让下一轮修复前端工程结构和启动入口，自动化不能强行假设 Vite 可启动。

### may-4778

- 项目目录存在。
- 前后端依赖均存在。
- 后端端口 `47781` 正在监听。
- 前端端口 `47782` 正在监听。
- `http://127.0.0.1:47781/api/health` 返回 200。
- `http://127.0.0.1:47782/` 返回 200。

判断：可作为本组第一阶段浏览器验收样本。

### may-4779

- 项目目录存在。
- 前端 package.json 存在。
- 后端 package.json 存在。
- 前端依赖未安装。
- 后端依赖未安装。
- 配置端口：后端 `47791`，前端 `47792`。
- 两个端口均未监听。

判断：当前不能直接进入浏览器验收，需要先按项目端口安全规则安装依赖并启动。

## Trae 窗口观察

当前 macOS Accessibility 只枚举到以下 Electron 窗口：

```text
may-4793
may-4791
may-4792
may-4789
```

没有枚举到本组 `may-4776` 到 `may-4779`。

这验证了规划中的判断：Trae 窗口可能分布在不同 macOS 虚拟桌面，窗口标题扫描不能作为唯一事实源。后续 UI Operator 需要：

- 串行操作。
- 聚焦前先确认目标窗口存在。
- 如果当前 Space 不可见，需要人工切换或补充更强的窗口发现机制。
- 在窗口不可见时仍允许非 UI Worker 继续处理项目目录、端口、API、截图和日志。

## may-4778 浏览器验收结果

访问地址：

```text
http://127.0.0.1:47782/
```

页面状态：

- 首页可打开，HTTP 200。
- 页面标题是“短视频平台”。
- 推荐页有顶部切换、活动 banner、互动按钮和底部导航。
- `api/videos/feed` 返回真实列表数据，包含 `video_url`、`cover_url`、点赞数、评论数、位置等字段。
- `api/search/hot` 返回热搜列表数据。

截图观察：

- 主视觉视频区域大面积黑屏，未显示真实视频画面或封面图。
- 屏幕中只看到活动 banner、作者信息、互动按钮、底部导航和文字信息。
- 对短视频推荐产品来说，首屏核心消费内容应该是视频/封面画面，当前视觉结果不达标。

console 观察：

- `获取位置失败` 出现两次，位置失败没有明显页面兜底提示。
- `Recommend.jsx` 出现多条 React key 重复告警：

```text
Encountered two children with the same key
```

- `favicon.ico` 404。

## 本次验证出的自动化价值

这次试跑没有点 Trae，但已经能自动拿到以下证据：

- 哪些项目可以直接验收，哪些项目还缺依赖或启动入口。
- 哪些端口真实监听。
- API 是否可访问。
- 页面是否能打开。
- 页面截图。
- console 错误。
- network/HTTP 错误。
- 可直接转成下一轮反馈的问题点。

这证明“并行 Non-UI Worker + 串行 UI Operator”的路线是可行的。第一阶段不需要动 Trae 窗口，也能筛出有效反馈。

## may-4778 下一轮反馈草稿

```text
当前 http://127.0.0.1:47782/ 可以打开，后端 http://127.0.0.1:47781/api/health 返回正常，/api/videos/feed 和 /api/search/hot 也都有数据返回，说明前后端链路已经基本接通。

但推荐页首屏主视觉区域大面积黑屏，没有显示真实视频画面或封面图；短视频推荐页的核心消费内容应该是视频/封面画面，而不是只显示作者、标题、点赞评论按钮和底部导航。请优先检查 Recommend.jsx 中 video/cover 的渲染逻辑、视频标签 poster、自动播放/静音策略、封面图兜底和样式层级，确保首屏每条推荐都能看到明确的视频画面或封面。

同时浏览器控制台出现多条 React key 重复告警，位置在 Recommend.jsx，说明推荐列表渲染时 key 生成不稳定或重复，可能导致视频项重复、状态错乱或更新异常。请修复列表 key 使用方式，避免使用会重复的字段。

另外页面记录了两次“获取位置失败”，需要提供同城定位失败后的可见兜底状态，例如默认城市、重新定位入口或提示文案，避免同城推荐逻辑静默失败。

修复后请重新启动 47781/47782，只处理当前项目端口，不要杀死其他项目进程，并用浏览器验证：首页推荐视频画面可见、同城失败有兜底、搜索页热搜正常、控制台不再出现 React key 重复告警。
```

## 后续建议

### 第三阶段补充：下一轮反馈草稿生成

已新增草稿生成脚本：

```text
solo-coder/workbench/automation/trae_next_prompt_draft.py
```

执行命令：

```bash
python3 solo-coder/workbench/automation/trae_next_prompt_draft.py \
  --group 'may-4776-may-4779-第13组'
```

输出文件：

```text
docs/data/generated/automation_probe/may-4776-may-4779-第13组/next_prompt_drafts.json
docs/data/generated/automation_probe/may-4776-may-4779-第13组/next_prompt_drafts.md
```

该脚本目前只读取非 UI 试跑结果，不点击 Trae，也不自动提交 prompt。

生成逻辑：

- 读取 `probe.json`，判断项目目录、前后端端口、依赖安装、端口监听和 HTTP 状态。
- 读取 `<order>-browser-report.json`，提取页面标题、正文片段、console message、请求失败和 HTTP 异常。
- 读取 `<order>-frontend.png`，用 PNG 像素分析主视觉区域黑色像素占比。
- 将证据、问题和处理顺序整理成下一轮可复制给 Trae 的 prompt 草稿。

本次生成质量：

- `may-4776`：识别为前后端端口未监听、前后端依赖未安装，草稿要求先补齐依赖和启动链路。
- `may-4777`：识别为端口未监听、依赖未安装，草稿要求先恢复可访问运行态。
- `may-4778`：识别为可访问运行态，草稿引用了 `47782` 前端、`47781/api/health` 后端、主视觉黑屏比例 `0.9981`、React key 重复告警 8 次和位置获取失败 2 次。
- `may-4779`：识别为前后端端口未监听、依赖未安装，草稿要求按项目端口启动并验证。

`may-4778` 当前自动生成的下一轮 prompt 核心内容：

```text
当前 http://127.0.0.1:47782/ 可以打开，后端健康检查 http://127.0.0.1:47781/api/health 可用，说明已有运行态可以进入浏览器验收。

已核对到的证据：项目目录存在：/Users/chen/Documents/trae_projects/local_projects/may-4778；配置端口：前端 [47782]，后端 [47781]；正在监听的项目端口：[47782, 47781]；浏览器访问 http://127.0.0.1:47782/ 返回 HTTP 200，页面标题为“短视频平台”；后端健康检查地址：http://127.0.0.1:47781/api/health。

需要优先修复的问题：Recommend.jsx 出现 React key 重复告警 8 次，列表 key 生成不稳定，可能导致视频项重复、状态错乱或更新异常；位置获取失败出现 2 次，同城定位失败缺少明确可见的兜底状态；推荐页首屏主视觉区域大面积黑屏，没有显示真实视频画面或封面图。

请按以下顺序处理：优先检查推荐页 video/cover 渲染、video poster、自动播放/静音策略、封面图兜底和样式层级，确保首屏每条推荐能看到明确的视频画面或封面；修复 Recommend.jsx 推荐列表 key 使用方式，避免使用重复字段或数组索引导致状态错乱；为同城定位失败提供默认城市、重新定位入口或明显提示，不要只在控制台打印。

修复后请重新启动当前项目端口（前端 [47782]，后端 [47781]），只处理当前项目进程，不要杀死其他项目端口，并用浏览器截图和 API 请求验证主链路。
```

## 后续建议

下一步应把本次三个脚本接入 Workbench 页面，先提供“仅探测”“浏览器检查”“生成下一轮反馈草稿”按钮，不直接提交 Trae。

待这三步稳定后，再接入串行 Trae UI Operator。
