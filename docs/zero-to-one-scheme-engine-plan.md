# 0-1 方案生成引擎规划

## 目标

把 `data` 里的大量项目、插件、App、网站资料整理成可复用的业务素材库，再通过用户、场景、痛点、平台、商业模式、功能组合的重组，批量生成 `0-1` 项目方案、生成提示词和代码生成任务。

核心目标不是 `100 条数据生成 100 个项目`，而是让 `100 条数据通过组合扩展出 1000 套 0-1 方案`。

## 总体流程

```text
原始数据 raw source
  ↓ 清洗、归一、打标签
素材原子 atoms
  ↓ 按业务域聚合
场景配方 scenario recipes
  ↓ 组合用户 / 痛点 / 能力 / 平台 / 商业模式
0-1 方案候选 zero-to-one candidates
  ↓ 补全 MVP / 页面 / 数据模型 / 技术栈
生成提示词 generation prompts
  ↓ 入队并行执行
代码生成任务 generation tasks
```

## 前端口径

前端不要直接以“项目列表”为主口径，而应该围绕 `0-1代码生成` 拆成四个工作区。

### 1. 素材库

用途：查看后端整理出来的可复用素材，不直接跑代码。

推荐字段：

- `业务域`：购物、娱乐、教育、营销、客服、开发者工具等。
- `来源类型`：Chrome 插件、Web 项目、移动 App、SaaS、开源项目等。
- `参考产品`：来自原始数据的产品名。
- `核心能力`：比价、优惠券、监控、自动化、分析、同步、下载等。
- `目标用户`：消费者、卖家、运营、品牌方、内容创作者等。
- `痛点`：从描述和分类中抽取的可复用问题。
- `可用平台`：Chrome 插件、全栈 Web、移动 App、Shopify 插件等。

### 2. 方案生成器

用途：选择一批素材和生成策略，批量生成多个 `0-1` 方案候选。

推荐控件：

- `业务域`：例如购物。
- `目标用户`：例如跨境电商卖家、优惠敏感消费者、Shopify 店主。
- `产品形态`：Chrome 插件、全栈 Web 应用、移动 App、SaaS、数据看板。
- `能力组合`：比价 + 优惠券、价格追踪 + 降价提醒、评论总结 + 风险提示。
- `商业模式`：联盟佣金、订阅制、B 端数据服务、增值服务。
- `复杂度`：S / M / L。
- `生成数量`：一次生成 10 / 20 / 50 套。

### 3. 方案池

用途：展示已经生成出来的 `0-1` 候选方案，并支持筛选、去重、评分。

推荐字段：

- `方案名称`
- `业务域`
- `目标用户`
- `核心痛点`
- `产品形态`
- `能力组合`
- `差异化角度`
- `MVP 完整度`
- `可生成评分`
- `Prompt 状态`
- `代码生成状态`

### 4. 生成队列

用途：只放已经确认要进入代码生成的任务。

推荐字段：

- `项目名`
- `Prompt 版本`
- `技术栈`
- `生成引擎`
- `状态`
- `输出目录`
- `失败原因`
- `重试次数`

## 后端数据分层

建议保留原始数据，同时新增可消费的中间层和生成层。

```text
data/
  raw 或现有原始目录
  normalized/
    source_items.json
    product_atoms.json
    scenario_atoms.json
    user_atoms.json
    pain_point_atoms.json
    capability_atoms.json
    business_model_atoms.json
    platform_atoms.json
  generated/
    scenario_recipes.json
    zero_to_one_candidates.json
    generation_prompts.json
    generation_tasks.json
```

当前第一版先落地四个关键文件：

- `data/normalized/product_atoms.json`
- `data/generated/scenario_recipes.json`
- `data/generated/zero_to_one_candidates.json`
- `data/generated/generation_prompts.json`

## 核心数据模型

### ProductAtom

`ProductAtom` 是从原始产品、插件、项目中抽取出的可复用素材。

```ts
type ProductAtom = {
  id: string
  source: string
  source_category: string
  source_index?: number
  reference_product: string
  rating?: number
  raw_description: string
  business_domain: string
  capabilities: string[]
  target_users: string[]
  pain_points: string[]
  platform_options: string[]
  monetization_options: string[]
  tags: string[]
}
```

### ScenarioRecipe

`ScenarioRecipe` 是生成方案的配方，不是最终项目。

```ts
type ScenarioRecipe = {
  id: string
  name: string
  business_domain: string
  scenario_angle: string
  user_segments: string[]
  required_capabilities: string[]
  optional_capabilities: string[]
  platform_options: string[]
  monetization_options: string[]
  variation_rules: {
    user_variants: string[]
    platform_variants: string[]
    positioning_variants: string[]
    feature_bundle_variants: string[]
    monetization_variants: string[]
  }
}
```

### ZeroToOneCandidate

`ZeroToOneCandidate` 是前端方案池展示和后续生成 Prompt 的核心对象。

```ts
type ZeroToOneCandidate = {
  id: string
  recipe_id: string
  business_domain: string
  name: string
  target_user: string
  product_form: string
  core_pain_point: string
  capability_bundle: string[]
  differentiation: string
  monetization: string
  mvp_features: string[]
  pages: string[]
  data_models: string[]
  reference_products: string[]
  source_atom_ids: string[]
  prompt_status: 'missing' | 'draft' | 'ready' | 'approved'
  generation_status: 'not_started' | 'queued' | 'running' | 'success' | 'failed'
  generation_score: number
}
```

## 购物类第一版样板

先从 `data/chrome_web_store/shopping_extensions.json` 消费购物类 Chrome 插件数据，抽取：

- 优惠券 / 自动应用优惠码
- 返现 / 奖励
- 比价 / 商品对比
- 价格追踪 / 降价提醒
- 评论总结 / 购物决策
- 卖家评分 / 商品风险识别
- 愿望清单 / 库存提醒

第一版输出：

- 一批购物类 `ProductAtom`
- 5 个左右购物类 `ScenarioRecipe`
- 每个配方生成多套 `ZeroToOneCandidate`

## 实施顺序

1. 保留现有 `data` 原始文件，不覆盖、不破坏。
2. 新增脚本从购物类数据生成素材原子。
3. 固化购物类场景配方。
4. 基于配方组合生成 `0-1` 方案候选。
5. 前端接入 `zero_to_one_candidates.json` 做方案池。
6. 方案池稳定后，持续优化 Prompt 模板与批量导出能力。

## 当前闭环使用方式

当前第一版购物业务闭环只做到 Prompt 生产，不自动调用 Codex，也不自动生成代码：

```text
购物原始数据
  ↓ scripts/generate_zero_to_one_samples.mjs
购物素材原子 / 场景配方 / 方案候选
  ↓ 批量组装
0-1 项目生成 Prompt
  ↓ workbench 页面查看
复制单条 Prompt 或导出全部 Prompt
```

使用步骤：

1. 重新生成购物方案和 Prompt：`node scripts/generate_zero_to_one_samples.mjs`
2. 启动页面服务：`./solo-coder/workbench/start_workbench.sh`
3. 打开页面：`http://127.0.0.1:8090/index.html`
4. 在列表中查看方案，每行都带 `复制 Prompt` 按钮。
5. 点击任意方案行，在详情区查看完整 Prompt。
6. 可点击 `复制当前 Prompt`、`导出当前 Prompt` 或 `导出全部 Prompt`。

当前核心产物是：`data/generated/generation_prompts.json`。

Codex CLI 只是未来可选的执行器，不属于当前闭环。

## 购物 Prompt 裂变 v2

第一版 `5 个配方 × 4 个用户变体 = 20 条 Prompt` 只适合验证链路，不适合规模化生产。v2 的目标是把购物题材从“样板生成”升级成“裂变生成”。

### v2 目标

```text
64 条购物原始素材
  ↓ 能力 / 用户 / 痛点抽取
购物素材原子
  ↓ 多维度组合 + 合理性过滤
2000 套基础 0-1 方案
  ↓ 每套生成 1 个 Prompt
2000 条 0-1 项目生成 Prompt
```

### v2 数据产物

```text
data/generated/
  shopping_prompt_factory_config.json  购物裂变配置
  zero_to_one_candidates.json          基础方案池
  generation_prompts.json              最终 Prompt 池
```

### v2 组合维度

v2 不再只按 `recipe.user_variants` 生成，而是基于以下维度组合：

- `用户人群`：学生党、宝妈、高频网购用户、亚马逊卖家、Shopify 店主、品牌运营等。
- `场景角度`：结账省钱、降价提醒、评论总结、竞品监控、购物支出分析等。
- `平台形态`：Chrome 插件、全栈 Web 应用、移动 App、数据看板、Shopify 插件等。
- `能力包`：优惠券发现 + 自动应用优惠码、价格追踪 + 降价提醒、评论洞察 + 风险提示等。
- `商业模式`：联盟佣金、高级订阅、B 端 SaaS 订阅、商家推广位、数据报告付费等。
- `复杂度`：S / M / L。
- `Prompt 版本`：MVP 快速版、AI 增强版、SaaS 完整版、数据看板版等。

### v2 合理性过滤

为了避免无意义组合，生成时加入兼容规则：

- C 端用户适合 `Chrome 插件 / 移动 App / 全栈 Web 应用`。
- B 端卖家、运营、品牌方适合 `数据看板 / 全栈 Web 应用 / Shopify 插件`。
- `Shopify 插件` 优先匹配 Shopify 店主、独立站运营、品牌运营。
- `数据看板` 优先匹配卖家、运营、企业采购、品牌方。
- `B端SaaS订阅 / 团队版套餐 / 数据报告付费` 不分配给学生党、宝妈等纯 C 端用户。
- 功能包需要和场景能力匹配，避免“评论总结场景只生成优惠券工具”这类错配。

### v2 前端口径

前端列表从“方案列表”升级成“Prompt 列表”。每一行就是一条可复制、可导出的 0-1 Prompt。

前端需要展示：

- 顶部统计：素材数、方案数、Prompt 数、当前筛选结果数。
- 筛选条件：用户、平台、场景、商业模式、Prompt 版本。
- 列表字段：Prompt 名称、用户 / 平台、场景、能力包、Prompt 版本、复制按钮。
- 详情区：只显示完整 Prompt 内容。
- 批量导出：导出当前筛选结果，而不是只能导出全部。

### 当前边界

v2 仍然只生产 Prompt，不执行代码生成。Codex CLI、代码输出目录、任务队列都不属于当前闭环。

### v2 当前落地结果

当前已把购物题材扩展到：

```text
64 条购物素材原子
20 个购物场景配方
1000 套基础 0-1 方案
2000 条 0-1 Prompt
```

覆盖维度：

- `20` 类用户
- `20` 个购物场景
- `9` 种平台形态
- `12` 组能力包
- `10` 种商业模式
- `3` 种复杂度
- `6` 种 Prompt 版本

当前为单方案单 Prompt：每个 `candidate_id` 只对应 1 条 Prompt，避免同一方案被不同版本重复刷屏；所有 Prompt 均带唯一 `id` 和唯一 `name`，便于筛选、复制、导出和后续去重评分。


### v2 命名与列表展示修正

为避免同一方案在列表中被 `MVP快速版 / AI增强版 / SaaS完整版 / 团队版 / Pro` 等字样刷屏，当前列表展示的 `name` 已改为干净的方案名称。Prompt 版本、复杂度、商业模式仍保留在 Prompt 详情字段中，但不再拼进列表名称。

前端列表已进入紧凑模式：顶部统计卡片、筛选控件、表格字号和行高均已压缩，以适配 2000 条 Prompt 的浏览和筛选。

### v2 Prompt 文案修正

Prompt 内容已从字段清单式结构改为可直接复制使用的自然语言任务描述。现在每条 Prompt 都是一段完整的代码生成需求说明，包含项目目标、目标用户、核心场景、业务闭环、功能范围、页面结构、数据模型、mock 数据要求、技术栈建议、参考产品和 README 要求，但不再以 `Prompt版本 / 项目名称 / 业务域` 这类表格字段开头。

## 多业务域 Prompt 工厂升级

当前已从单一购物域升级为多业务域统一 Prompt 工厂。页面通过 `业务` 下拉框切换不同场景，不再为每个业务单独维护一套前端页面。

### 已接入业务域

当前接入 `10` 个 Chrome Web Store 数据分类：

- 购物
- 娱乐
- 社交
- 旅游
- 游戏
- 健康
- 家居
- 新闻与天气
- 艺术与设计
- 趣味休闲

### 当前生成结果

```text
1184 条素材原子
100 个场景配方
12300 套基础 0-1 方案
12300 条自然语言 Prompt
```

每个基础方案只对应 `1` 条 Prompt，避免同一方案用不同版本重复刷屏。

### 各业务域 Prompt 数

```text
购物：2000
娱乐：1200
社交：900
旅游：900
游戏：1200
健康：1500
家居：1500
新闻与天气：900
艺术与设计：1000
趣味休闲：1200
```

### 页面使用方式

1. 启动页面：`./solo-coder/workbench/start_workbench.sh`
2. 打开：`http://127.0.0.1:8090/index.html`
3. 使用顶部 `业务` 下拉框切换购物、社交、娱乐、旅游等业务域。
4. 可继续按用户、平台、场景和关键词筛选。
5. 每一行都可以直接复制自然语言 Prompt。
6. 下方详情区只显示完整 Prompt 内容。
7. `导出当前筛选 Prompt` 只导出当前筛选结果。

### 数据产物

```text
data/normalized/product_atoms.json
data/generated/multi_domain_prompt_factory_config.json
data/generated/scenario_recipes.json
data/generated/zero_to_one_candidates.json
data/generated/generation_prompts.json
```

### Prompt 开头自然化修正

Prompt 开头已去掉固定模板腔和中文书名号样式，不再使用 `请帮我从 0 到 1 生成一个可以本地运行的「项目名」项目`，也不再出现 `不要做成空壳 Demo` 这类生硬提示。当前改为更自然的直接任务描述，例如：`生成一个可以本地运行的 XXX 项目，目标用户是...`。

### 多口吻 Prompt 生成体系

Prompt 生成已从单一模板升级为多口吻表达系统。当前通过 `角色家族 × 细分口吻 × 需求意图 × 详细程度 × 开头句式 × 约束表达` 组合生成自然语言需求。

当前口吻维度：

- `20` 个角色家族，例如产品经理、创业者、技术负责人、非技术老板、运营负责人、数据分析师、设计负责人、独立开发者等。
- 每个角色家族包含 `8` 个细分口吻，例如产品经理下有 MVP探索型、PRD需求型、用户旅程型、增长实验型、竞品拆解型、版本迭代型、数据指标型、老板汇报型。
- `12` 种需求意图，例如想法验证、产品需求、工程实现、竞品启发、内部工具、快速Demo、商业化SaaS、浏览器插件、数据看板、AI增强、自动化提效、个人自用。
- `4` 种详细程度：brief、normal、detailed、engineering。
- 多种自然开头和约束表达，避免所有 Prompt 使用同一套句式。

当前 `12300` 条 Prompt 中实际覆盖 `6136` 种不同 `prompt_tone_id`，同时保留 `prompt_persona`、`prompt_subtone`、`prompt_intent`、`prompt_detail` 字段，便于后续筛选和分析。正文不再强行写“我是某某角色”，而是用对应口吻影响表达方式。

### Prompt 结构去模板化修正

在多口吻基础上继续去掉固定段落位置。当前不再只用 `brief / normal / detailed / engineering` 四类固定结构，而是改为 `16` 种结构模板混合生成，包括背景先行、粗略想法、产品用户故事、任务卡片、竞品启发、非技术老板、工程验收、内部工具、数据视角、插件轻量、创业验证、外包交付、用户问题、紧凑 PRD、运营流程、提问式需求等。不同 Prompt 的开头、段落顺序、详细程度和约束位置都会变化，避免所有内容看起来像同一个模板替换出来。

### 自然语言 Prompt 禁用词修正

已移除标签式关键词和明显模板词：`任务：`、`目标用户：`、`场景：`、`产品形态：`、`核心模块：`、`建议页面：`、`要求：`、`产品需求：`、`定位：`、`主流程：`、`页面：`、`数据：`、`约束：`。同时移除 `演示`、`可交付`、`范围控制`、`MVP`、`Demo` 等容易显得模板化的词，改为更自然的“第一版”“本地可运行版本”“可以打开体验的版本”等表达。

### 进一步去模板腔修正

继续清理自然语言 Prompt 中的模板腔表达，已移除 `体验的版本`、`大概`、`小产品`、`用户故事可以这样理解` 等词。同时不再使用短关键词后接中文冒号的表达方式，例如 `任务：`、`目标用户：`、`主流程：`、`设想是这样的：`、`能跑通主流程就好：`。当前全量 Prompt 已校验这些表达命中为 0。

### App 与移动端表达清理

已将生成层中的 `移动App` 统一改为更中性的 `Web工具`，Prompt 和候选方案中不再强调 App、移动端或 React Native。复制按钮文案也从 `复制 Prompt` 改为 `复制`，按钮颜色改为更轻的绿色样式。

### 详情区三段式复制与移动表达清理

详情区已拆成三部分展示：背景、功能、交付，每部分都有独立复制按钮。顶部导出按钮改为 `导出`，移除 `Prompt池` 文案。生成数据中继续清理 `小程序`、`移动端`、`移动App`、`React Native` 和独立英文 `App`，不再强调移动应用形态。

### 前端状态与流程拆分

前端新增 `完成` 列，点击后会把状态写入 `data/generated/prompt_state.json`，对应行会变成完成态背景色，顶部也会统计完成 Prompt 数。原始 Prompt 数据仍然保存在 `data/generated/generation_prompts.json`，状态文件单独维护，方便后续增删改和批处理。

提示词流程说明已新增到 `scripts/prompt_flows/README.md`，后续可以按业务域、提示词类型和口吻类型继续拆分脚本与渲染规则。

### 页面紧凑化与完成态修正

页面进一步压缩：顶部文字移除，统计卡片压成一行，筛选条件容器收缩。列表新增完成图标标签，完成后整行背景和文字变为完成态颜色。复制按钮改为图标标签。表格列使用虚线分隔，列文字居中。底部 Prompt 详情不再显示背景/功能/交付标题，每段仅保留一行内容和末尾复制按钮。

### 全屏紧凑布局修正

已移除导出按钮和左侧伪导航，页面改为填充整个屏幕。顶部统计卡片固定为一行展示，筛选条件默认折叠，需要时手动展开。底部 Prompt 摘要继续保持单行紧凑显示。

### Web 化平台修正

已去掉插件、扩展、侧边栏、Telegram、Bot、桌面、移动、小程序、App 等平台或形态表达。当前平台收敛为 `Web前端`、`全栈Web应用`、`数据看板`、`纯后端API服务` 四类，便于后续统一按 Web 项目生成。

### Web 与前端词汇清理

继续清理可见字段中的 `Web/web/WEB/前端` 表达。当前前端可见的平台只保留 `界面应用`、`全栈应用`、`数据看板`、`纯后端API服务`，Prompt 正文、名称、平台、用户、场景和能力组合等可见字段已校验不再包含 `web` 或 `前端`。

### 场景按钮、全局序号与目录映射

列表上方新增业务场景按钮，点击后会切换对应业务域数据。Prompt 序号改为全局唯一序号，不再随筛选结果从 1 重新开始。序号旁新增编辑按钮，可修改序号；后端会校验新序号不能与其他 Prompt 重复。序号状态写入 `data/generated/prompt_state.json` 的 `orders` 字段。

目录已同步到 `/Users/chen/Documents/trae_projects`，按业务场景创建一级目录，并在各业务场景目录下创建对应全局序号文件夹。例如 `/Users/chen/Documents/trae_projects/购物/1`。当前已同步 `12300` 个 Prompt 序号文件夹。

### 场景按钮、全局序号与目录落盘

列表上方新增业务场景按钮，点击后按业务域切换列表。序号改为全局唯一序号，不会因为切换场景重新从 1 开始。序号旁新增轻量编辑按钮，点击后直接在表格原位置输入新序号；保存时会校验不能与其他数据重复。

序号对应本地目录：`/Users/chen/Documents/trae_projects/{场景}/{序号}`。已同步创建所有场景目录和序号目录。修改序号时，后端会同步把对应场景下的旧序号文件夹重命名为新序号文件夹。

### 场景前缀序号规则

默认初始序号已改为 `{场景前缀}-{全局数字}`，用于避免后续手动改成纯数字时与初始序号混淆。前端默认展示如 `g-1`、`s-2001`、`yl-2901` 这样的序号；手动修改时仍然只输入纯数字，例如 `13001`。后端会校验纯数字序号不能与其他已修改序号重复，并同步重命名对应场景目录下的文件夹。

当前场景前缀：购物 `g-`，社交 `s-`，娱乐 `yl-`，旅游 `l-`，游戏 `yx-`，健康 `jk-`，家居 `jj-`，新闻与天气 `xw-`，艺术与设计 `ys-`，趣味休闲 `qx-`。
