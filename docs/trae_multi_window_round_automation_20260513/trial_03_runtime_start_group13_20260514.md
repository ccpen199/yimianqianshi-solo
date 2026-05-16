# 试跑 03：第 13 组安全运行态启动

时间：2026-05-14

## 前端入口说明

Workbench 页面不是 React/Vite 工程，前端入口是：

```text
solo-coder/workbench/index.html
solo-coder/workbench/app.js
solo-coder/workbench/styles.css
```

其中“Trae 多轮自动化”区域在：

```text
solo-coder/workbench/index.html
  id="roundAutomationTabPanel"

solo-coder/workbench/app.js
  runRoundAutomationStep(...)
  renderRoundAutomationProbe(...)
  renderRoundAutomationRuntime(...)
  renderRoundAutomationBrowser(...)
  renderRoundAutomationDrafts(...)
```

后端入口是：

```text
solo-coder/workbench/serve_workbench.py
```

新增 API：

```text
POST /api/trae-round-automation-runtime-start
```

## 本次目标

接着试跑 02 的结论，补上“安全运行态启动器”：

```text
第 13 组：may-4776-may-4779-第13组
目标：在不点击 Trae、不杀全局进程的前提下，让可启动项目进入浏览器可验收状态。
```

## 本次新增能力

新增脚本：

```text
solo-coder/workbench/automation/trae_safe_runtime_start.py
```

安全规则：

```text
1. 只处理目标项目目录。
2. 只检查目标项目配置端口。
3. 端口被其他 cwd 占用时标记 blocked，不杀进程。
4. 已经由当前项目占用的端口直接复用。
5. 前端用本地 vite 显式指定 --host 127.0.0.1 --port <port> --strictPort。
6. 后端显式注入 PORT / BACKEND_PORT / FRONTEND_PORT，避免继承外部 PORT。
7. 启动日志写入 automation_probe/<group>/runtime_logs。
8. 启动后同时探测 127.0.0.1 和 [::1]，记录真实可访问地址。
```

Workbench 页面也新增了按钮：

```text
Trae 多轮自动化 -> 安全启动运行态
```

## 执行命令

```bash
python3 solo-coder/workbench/automation/trae_safe_runtime_start.py \
  --group 'may-4776-may-4779-第13组' \
  --wait-seconds 14

python3 solo-coder/workbench/automation/trae_round_probe.py \
  --group 'may-4776-may-4779-第13组'

node solo-coder/workbench/automation/trae_browser_runtime_check.js \
  --order may-4776 \
  --url 'http://[::1]:24776/' \
  --out-dir 'docs/data/generated/automation_probe/may-4776-may-4779-第13组' \
  --wait-ms 4500

node solo-coder/workbench/automation/trae_browser_runtime_check.js \
  --order may-4777 \
  --url 'http://127.0.0.1:47772/' \
  --out-dir 'docs/data/generated/automation_probe/may-4776-may-4779-第13组' \
  --wait-ms 4500

node solo-coder/workbench/automation/trae_browser_runtime_check.js \
  --order may-4778 \
  --url 'http://127.0.0.1:47782/' \
  --out-dir 'docs/data/generated/automation_probe/may-4776-may-4779-第13组' \
  --wait-ms 4500

python3 solo-coder/workbench/automation/trae_next_prompt_draft.py \
  --group 'may-4776-may-4779-第13组'
```

## 产物位置

```text
docs/data/generated/automation_probe/may-4776-may-4779-第13组/runtime_start_report.json
docs/data/generated/automation_probe/may-4776-may-4779-第13组/probe.json
docs/data/generated/automation_probe/may-4776-may-4779-第13组/may-4776-browser-report.json
docs/data/generated/automation_probe/may-4776-may-4779-第13组/may-4777-browser-report.json
docs/data/generated/automation_probe/may-4776-may-4779-第13组/may-4778-browser-report.json
docs/data/generated/automation_probe/may-4776-may-4779-第13组/next_prompt_drafts.md
docs/data/generated/automation_probe/may-4776-may-4779-第13组/runtime_logs/
```

## 运行态结果

```text
may-4776:
  复用已有后端 14776 和前端 24776
  前端真实地址：http://[::1]:24776/
  后端健康检查：http://127.0.0.1:14776/health
  状态：可浏览器验收

may-4777:
  启动/复用后端 47771 和前端 47772
  前端真实地址：http://127.0.0.1:47772/
  后端健康检查：http://127.0.0.1:47771/api/health
  状态：可浏览器验收

may-4778:
  启动/复用后端 47781 和前端 47782
  前端真实地址：http://127.0.0.1:47782/
  后端健康检查：http://127.0.0.1:47781/api/health
  状态：可浏览器验收

may-4779:
  未识别到前后端端口
  frontend/package.json 和 backend/package.json 缺失
  状态：需先恢复工程入口
```

## 浏览器验收结果

### may-4776

```text
HTTP 200
标题：映客 - 直播社交平台
页面有推荐、附近、热门、主播列表和底部导航
问题：favicon.ico 404
```

### may-4777

```text
HTTP 200
标题：网易云音乐私藏推荐
后端 health 正常
问题：页面正文没有可见文本，疑似根组件未渲染、路由空挂载或白屏
```

### may-4778

```text
HTTP 200
标题：短视频
页面有推荐流、作者、标题、音乐、点赞评论和底部导航
问题：
  favicon.ico 404
  视频资源 https://www.w3schools.com/html/mov_bbb.mp4 多次 net::ERR_ABORTED
```

## 代码修正

本次还修了两个解析问题：

```text
1. 前端 package.json 中的 --port 不再误并入后端端口。
2. 后端代码中 CORS 的 localhost:<前端端口> 不再误识别为后端端口。
```

修改文件：

```text
solo-coder/workbench/automation/trae_round_probe.py
solo-coder/workbench/automation/trae_safe_runtime_start.py
solo-coder/workbench/automation/trae_next_prompt_draft.py
solo-coder/workbench/index.html
solo-coder/workbench/app.js
solo-coder/workbench/serve_workbench.py
```

## Workbench 验证

Workbench 已重启到新版本，接口验证通过：

```text
http://127.0.0.1:8090/index.html
http://127.0.0.1:8091/index.html

POST /api/trae-round-automation-runtime-start
返回 action=runtime-start，may-4776 frontendUrl=http://[::1]:24776/
```

前端缓存版本：

```text
app.js?v=111
```

## 下一步

第 13 组已经完成“运行态启动 + 浏览器验收 + 下一轮反馈草稿”闭环。下一步不要直接进入 12-16 窗口全自动点击，建议先做一个“串行提交前检查队列”：

```text
1. 读取 next_prompt_drafts.md。
2. 只挑选有明确问题的项目进入 waiting_ui_submit。
3. may-4776 只有 favicon 404，可低优先级或跳过。
4. may-4777 应提交白屏/根组件未渲染问题。
5. may-4778 应提交视频外链资源失败和静态资源问题。
6. may-4779 应提交工程入口缺失问题。
7. UI Operator 仍然一次只操作一个 Trae 窗口。
```
