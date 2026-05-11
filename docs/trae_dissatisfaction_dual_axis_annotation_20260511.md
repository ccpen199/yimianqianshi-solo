# Trae 不满意原因双轴标注方法 20260511

## 本次测试范围

- 批量组：`may-991-may-994-第04组`
- 序号项目：`may-991`、`may-992`、`may-993`、`may-994`
- 标注行数：21 行
- 写入位置：`docs/data/generated/trae_session_rounds/{order}.json` 的 `rows[].dissatisfactionReason`
- 标注版本：`manual_dual_axis_quality_audit_20260511_v2`

## 使用资料

1. 官方标注指导：`官方文档指导.log`
   - 不满意理由不能只写“无法运行、页面打不开、接口失败”等笼统结论。
   - 至少要覆盖范围/对象、现象/证据、与需求偏差、影响范围、复现条件、严重程度中的两项。

2. 会话轮次缓存：
   - `docs/data/generated/trae_session_rounds/may-991.json`
   - `docs/data/generated/trae_session_rounds/may-992.json`
   - `docs/data/generated/trae_session_rounds/may-993.json`
   - `docs/data/generated/trae_session_rounds/may-994.json`

3. 每轮可用字段：
  - `conversation`：本轮验收输入或修复要求。
   - `logTrace`：本轮模型规划、工具调用、启动命令、测试命令、最终总结。
  - `screenshots`：该轮验收输入中附带的截图证据。
   - `sessionId/sessionComposite`：用于确认轮次顺序，不作为不满意原因正文。

## 行对齐规则

不满意原因列描述的是“上一轮产物为什么没有达到后续验收要求”。

因此第 N 行的标注应主要使用：

```text
第 N+1 行 conversation 中的验收输入
+ 第 N 行 logTrace 中的执行过程、测试方式和交付总结
+ 第 N+1 行 screenshots 中的截图证据
```

最后一行不返回 `-`，也不写证据缺失式话术。必须直接基于当前轮已有信息完成总结：

```text
产物不满意：结合当前轮输入、日志轨迹、截图和交付总结说明当前仍未闭环的页面、接口、数据或业务链路问题。
过程不满意：结合当前轮执行记录说明验收是否充分，若不充分要明确缺少启动证据、端口归属、页面点击、核心 API、异常场景或截图证据。
```

## 输出格式

每一行必须使用双轴结构：

```text
产物不满意：说明页面/接口/模块/功能的具体问题、证据、与需求偏差和影响。
过程不满意：说明模型执行过程中的问题，例如未启动、未验收、只跑 curl 未看页面、反复导航、日志缺失、未按端口安全处理、未按需求逐项验证等。
```

可以写成单行，便于飞书表格粘贴：

```text
产物不满意：...。过程不满意：...。
```

## 判断方法

1. 先读主需求。
   - 第一轮 `conversation` 通常包含完整业务需求和端口/验收/安全约束。
   - 后续轮次的验收输入必须回到主需求判断偏差，不能只复述一句“页面有问题”。

2. 再读后续验收输入。
   - 这是产物不满意的直接来源。
   - 需要保留具体对象和现象，例如“充值中心和天猫超市入口空白”“热门榜/推荐榜/垂直榜共用同一批数据”。

3. 再读上一轮日志轨迹。
   - 看是否实际创建/修改了对应文件。
   - 看是否启动了前后端。
   - 看是否只做 API curl，还是也做了浏览器页面验收。
   - 看是否出现反复试错、长时间无收敛、日志缺失、端口处理不安全等过程问题。

4. 最后看截图。
   - 截图用于增强证据，而不是替代分析。
   - 例如黑屏、`ERR_CONNECTION_REFUSED`、broken image、空白页面、榜单数据重复，都要转写成具体文字。

## 本次标注原则

- 只改 `dissatisfactionReason`、`annotationVersion`、`annotationUpdatedAt`、`annotationSource`。
- 不改 Session、会话、序号、截图、日志轨迹等列。
- 不把产物问题压缩成短标签，例如不要写“页面黑屏”，要写清楚访问地址、影响模块和主流程。
- 即使产物问题很明确，也必须继续分析过程是否存在问题。
- 如果过程没有明显失败，也要写明“过程不满意”的判断依据，例如验收不充分、缺少浏览器截图、只验证接口、启动说明不完整。
- 禁止输出证据缺失式、等待后续输入式、引用提出方要求式的话术。
- 不以提出方作为叙述主体；需要表达要求来源时写“业务要求”“验收要求”“主需求”“页面表现”或“交付过程”。
- 不能因为缺少后一轮验收输入就写证据缺失句，必须从当前轮的 prompt、日志轨迹、截图、启动和验收记录中直接提炼问题。

## 示例

原始验收输入：

```text
页面黑屏，过程方面，从会员体系到消息中心，都没有垂直业务作出正确的组件选择。
没有引入异步数据处理：Vue Query (TanStack Query)。
```

合格标注：

```text
产物不满意：前端 http://localhost:9911 首屏黑屏，会员体系、消息中心等电商垂直模块没有形成可用页面，核心购物路径无法进入。过程不满意：日志虽然创建了大量模块并跑了 API/启动命令，但验收偏后端 curl 和完成清单，未基于浏览器截图确认渲染，也未按要求建立稳定的异步数据状态处理。
```

## 后续 LLM-Agent 建议流程

2026-05-12 已落地到 Workbench：

```text
批量项目组 -> LLM-Agent -> 选择 DeepSeek V4 Pro -> 生成当前组
POST /api/annotate-dissatisfaction
```

服务端只写回本机 `data/generated/trae_session_rounds/{order}.json` 的不满意列相关字段，不改会话、截图和日志轨迹。没有 `DEEPSEEK_API_KEY` 时按钮会显示不可用，避免误以为已经走了大模型。

1. 输入一个批量组名或序号列表。
2. 读取 `prompt_state.json` 找到组内序号。
3. 逐个读取 `trae_session_rounds/{order}.json`。
4. 对每个 order 内的 rows 按时间顺序处理。
5. 对第 N 行构造上下文：
   - `mainRequirement = rows[0].conversation`
   - `currentTrace = rows[N].logTrace`
   - `nextValidationInput = rows[N+1].conversation`
   - `nextScreenshots = rows[N+1].screenshots`
6. 输出严格 JSON：

```json
{
  "items": [
    {
      "order": "may-991",
      "round": 1,
      "dissatisfactionReason": "产物不满意：...。过程不满意：...。"
    }
  ]
}
```

7. 写回缓存时只更新不满意列相关字段，并保留原始轮次、日志轨迹、截图和会话 ID。
