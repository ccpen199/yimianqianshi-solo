import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const NORMALIZED_DIR = path.join(ROOT, 'data/normalized');
const GENERATED_DIR = path.join(ROOT, 'data/generated');

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const writeJson = (filePath, data) => fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
const unique = (items) => [...new Set(items.filter(Boolean))];
const pick = (items, index) => items[index % items.length];
const hasOverlap = (left, right) => left.some((item) => right.includes(item));

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/™|®|★|\(|\)|\[|\]|:|,|，|。|、|&|\//g, ' ')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);

const cleanGeneratedText = (value) =>
  String(value)
    .replace(/移动App/g, '界面应用')
    .replace(/移动端/g, '页面')
    .replace(/React Native/g, '界面')
    .replace(/小程序/g, '界面应用')
    .replace(/插件/g, '应用工具')
    .replace(/扩展/g, '应用工具')
    .replace(/侧边栏/g, '页面')
    .replace(/Telegram Bot/g, '应用工具')
    .replace(/Bot/g, '应用工具')
    .replace(/桌面/g, '应用')
    .replace(/Web前端/g, '界面应用')
    .replace(/全栈Web应用/g, '全栈应用')
    .replace(/Web工具/g, '应用工具')
    .replace(/Web页面/g, '页面')
    .replace(/website/gi, 'site')
    .replace(/webpage/gi, 'page')
    .replace(/browser/gi, '工具')
    .replace(/\bWeb\b/g, '应用')
    .replace(/\bweb\b/g, '应用')
    .replace(/前端/g, '界面')
    .replace(/Demo/g, '第一版')
    .replace(/\bApp\b/g, '工具');

const hashText = (value) => {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const sourceFiles = [
  { domain: 'shopping', key: 'shopping', file: 'data/chrome_web_store/shopping_extensions.json', target: 2000 },
  { domain: 'entertainment', key: 'entertainment', file: 'data/chrome_web_store/entertainment/entertainment_extensions.json', target: 1200 },
  { domain: 'social', key: 'social', file: 'data/chrome_web_store/social/social_extensions.json', target: 900 },
  { domain: 'travel', key: 'travel', file: 'data/chrome_web_store/travel/travel_extensions.json', target: 900 },
  { domain: 'game', key: 'game', file: 'data/chrome_web_store/game_extensions.json', target: 1200 },
  { domain: 'health', key: 'health', file: 'data/chrome_web_store/health/health_extensions.json', target: 1500 },
  { domain: 'home', key: 'home', file: 'data/chrome_web_store/home/home_extensions.json', target: 1500 },
  { domain: 'news_weather', key: 'news_weather', file: 'data/chrome_web_store/news_weather/news_weather_extensions.json', target: 900 },
  { domain: 'art_design', key: 'art_design', file: 'data/chrome_web_store/art_design_extensions.json', target: 1000 },
  { domain: 'fun_leisure', key: 'fun_leisure', file: 'data/chrome_web_store/fun_leisure/fun_leisure_extensions.json', target: 1200 },
];

const baseModels = ['订阅制', '高级版', '广告位', '联盟佣金', '团队套餐', '数据报告付费', 'API调用计费', '模板售卖'];
const baseComplexities = ['S', 'M', 'L'];
const basePromptStyles = ['快速起步', 'AI能力增强', '数据看板', '自动化工具', '轻量应用工具', '完整SaaS'];

const domainConfigs = {
  shopping: {
    users: ['学生党', '宝妈', '高频网购用户', '数码产品消费者', '跨境购物用户', '亚马逊卖家', 'Shopify店主', 'TikTok小店卖家', '品牌运营', '企业采购员'],
    scenarios: ['结账省钱', '降价提醒', '历史价格判断', '评论总结', '商品对比', '同款搜索', '返现聚合', '库存提醒', '竞品监控', '预算控制'],
    platforms: ['界面应用', '全栈应用', '界面应用', '数据看板', '全栈应用', '界面应用', '界面应用'],
    capabilities: ['优惠券发现', '自动应用优惠码', '返现与奖励', '价格追踪', '比价与商品对比', '评论洞察', '库存提醒', '订单与支出分析', '卖家风险识别', '图片搜同款'],
    object: '商品、价格、优惠、评论和订单',
  },
  entertainment: {
    users: ['追剧用户', '音乐爱好者', '视频创作者', '直播观众', '影评博主', '播客听众', '二次元用户', '家庭影音用户'],
    scenarios: ['同步观影', '视频增强', '音频均衡', '歌词同步', '内容推荐', '弹幕互动', '观看记录管理', '片单收藏', '跳过广告片头', '多人娱乐房间'],
    platforms: ['界面应用', '全栈应用', '界面应用', '界面应用', '界面应用', '全栈应用'],
    capabilities: ['同步播放', '视频增强', '音频调节', '歌词识别', '内容收藏', 'AI推荐', '弹幕互动', '观看统计', '多人房间', '提醒通知'],
    object: '视频、音乐、直播、片单和观看记录',
  },
  social: {
    users: ['内容创作者', '社群运营', 'YouTube运营', 'Twitch观众', '品牌社媒经理', '普通社交用户', '粉丝社群管理员', '邮件重度用户'],
    scenarios: ['内容增长分析', '社群互动增强', '表情头像管理', '消息提醒', '共同观看', '粉丝关系维护', '评论管理', '创作者数据看板', '跨平台内容同步', '私域运营'],
    platforms: ['界面应用', '全栈应用', '数据看板', '界面应用', '全栈应用', '纯后端API服务'],
    capabilities: ['内容分析', '互动增强', '消息聚合', '评论管理', '粉丝画像', '数据看板', '自动提醒', '表情素材管理', '共同观看', '社群自动化'],
    object: '账号、内容、粉丝、评论和社群消息',
  },
  travel: {
    users: ['自由行用户', '商务差旅用户', '家庭旅行用户', '背包客', '旅行博主', '酒店运营', '机票比价用户', '本地探索用户'],
    scenarios: ['行程规划', '机酒比价', '签证材料整理', '旅行预算', '景点收藏', '天气风险提醒', '路线优化', '攻略生成', '航班酒店追踪', '本地活动发现'],
    platforms: ['全栈应用', '界面应用', '界面应用', '界面应用', '数据看板', '全栈应用'],
    capabilities: ['行程生成', '价格追踪', '地图路线', '天气提醒', '预算管理', '清单管理', '攻略总结', '收藏同步', '风险提示', '多人协作'],
    object: '目的地、航班、酒店、路线、天气和预算',
  },
  game: {
    users: ['休闲玩家', '硬核玩家', 'Steam用户', '手游玩家', '游戏主播', '电竞战队', '游戏社区运营', '家长'],
    scenarios: ['游戏折扣追踪', '战绩分析', '攻略管理', '游戏库整理', '开黑组队', '直播互动', '成就追踪', '游戏时间管理', 'MOD管理', '赛事提醒'],
    platforms: ['全栈应用', '界面应用', '界面应用', '数据看板', '界面应用', '界面应用'],
    capabilities: ['价格追踪', '战绩统计', '攻略收藏', '游戏库管理', '组队匹配', '直播互动', '成就分析', '时间提醒', '社区内容聚合', '赛事日历'],
    object: '游戏、账号、战绩、攻略、折扣和社区内容',
  },
  health: {
    users: ['健身用户', '慢病管理用户', '睡眠改善用户', '心理健康用户', '医生助理', '营养师', '家庭照护者', '企业健康管理者'],
    scenarios: ['习惯打卡', '运动计划', '饮食记录', '睡眠追踪', '用药提醒', '情绪记录', '健康报告', '家庭照护', '风险预警', '康复计划'],
    platforms: ['界面应用', '全栈应用', '数据看板', '界面应用', '界面应用', '全栈应用'],
    capabilities: ['打卡提醒', '数据记录', '趋势分析', 'AI建议', '报告生成', '风险提示', '计划管理', '家庭共享', '目标追踪', '知识库'],
    object: '健康指标、习惯、饮食、运动、睡眠和提醒',
  },
  home: {
    users: ['租房用户', '家庭主妇', '装修业主', '智能家居用户', '收纳爱好者', '房东', '物业人员', '家庭采购用户'],
    scenarios: ['家务清单', '装修预算', '家电维护', '智能设备管理', '菜谱提取', '家庭库存', '账单提醒', '空间收纳', '维修工单', '家庭协作'],
    platforms: ['界面应用', '全栈应用', '界面应用', '界面应用', '数据看板', '界面应用'],
    capabilities: ['清单管理', '预算记录', '提醒通知', '设备档案', '菜谱提取', '库存管理', '家庭协作', '工单跟踪', '图片记录', '数据统计'],
    object: '家庭任务、家电、预算、菜谱、库存和维修记录',
  },
  news_weather: {
    users: ['新闻读者', '投资者', '天气敏感用户', '内容编辑', '研究员', '户外工作者', '本地生活用户', '媒体运营'],
    scenarios: ['RSS聚合', '新闻摘要', '事实核查', '天气预警', '本地事件提醒', '舆情监控', '主题追踪', '简报生成', '信息源管理', '极端天气风险'],
    platforms: ['界面应用', '全栈应用', '界面应用', '数据看板', '全栈应用', '界面应用'],
    capabilities: ['信息聚合', 'AI摘要', '事实核查', '天气提醒', '主题订阅', '趋势分析', '来源管理', '简报导出', '风险预警', '关键词监控'],
    object: '新闻源、RSS、天气、关键词、地区和订阅主题',
  },
  art_design: {
    users: ['设计师', '插画师', '自媒体运营', '电商美工', '产品经理', '摄影爱好者', '品牌设计师', 'UI设计师'],
    scenarios: ['素材采集', '图片下载', '配色灵感', '在线修图', '设计参考管理', '品牌素材库', '批量图片处理', '作品集整理', 'AI生成素材', '设计审稿'],
    platforms: ['界面应用', '全栈应用', '数据看板', '界面应用', '界面应用', '纯后端API服务'],
    capabilities: ['图片采集', '素材管理', '批量处理', 'AI生成', '配色分析', '灵感收藏', '标注审稿', '格式转换', '品牌资产管理', '导出分享'],
    object: '图片、素材、配色、设计参考、品牌资产和作品集',
  },
  fun_leisure: {
    users: ['休闲用户', '桌宠爱好者', '减压用户', '动漫爱好者', '个性化浏览器用户', '学生党', '办公室用户', '宠物爱好者'],
    scenarios: ['浏览器个性化', '桌宠陪伴', '减压互动', '随机内容发现', '轻量小游戏', '光标主题', '音乐电台', '虚拟宠物养成', '社交分享', '休息提醒'],
    platforms: ['界面应用', '界面应用', '全栈应用', '界面应用', '界面应用'],
    capabilities: ['主题定制', '互动动画', '虚拟宠物', '减压效果', '随机推荐', '轻游戏机制', '音乐播放', '提醒通知', '收藏分享', '个性化设置'],
    object: '主题、桌宠、动画、小游戏、音乐和休闲互动记录',
  },
};

const capabilityKeywordMap = [
  ['AI建议', ['ai', 'chat', 'assistant', '智能', 'recommend', 'summary', '总结']],
  ['提醒通知', ['alert', 'notify', 'reminder', '提醒', '通知']],
  ['数据看板', ['analytics', 'stats', 'dashboard', 'score', '分析', '统计']],
  ['内容收藏', ['save', 'bookmark', '收藏', '保存']],
  ['同步协作', ['sync', 'party', 'together', 'collaboration', '同步', '协作']],
  ['下载导出', ['download', 'export', '下载', '导出']],
  ['增强体验', ['enhance', 'booster', 'improve', '增强', '优化']],
];

const loadSource = ({ file, domain }) => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  const items = data.items || data.extensions || [];
  return items.map((item, index) => ({ ...item, index: item.index || index + 1, business_domain: domain }));
};

const inferCapabilities = (item, config) => {
  const text = `${item.name} ${item.description}`.toLowerCase();
  const inferred = capabilityKeywordMap.filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword.toLowerCase()))).map(([label]) => label);
  return unique([...inferred, ...config.capabilities.slice(0, 3)]).slice(0, 6);
};

const buildProductAtoms = (sources) =>
  sources.flatMap((source) => {
    const config = domainConfigs[source.domain];
    return loadSource(source).map((item) => {
      const capabilities = inferCapabilities(item, config);
      return {
        id: `${source.key}_atom_${String(item.index).padStart(4, '0')}_${slugify(item.name)}`,
        source: 'chrome_应用_store',
        source_key: source.key,
        source_category: source.domain,
        source_index: item.index,
        reference_product: item.name,
        rating: item.rating,
        raw_description: item.description,
        business_domain: source.domain,
        capabilities,
        target_users: config.users.slice(0, 5),
        pain_points: config.scenarios.slice(0, 5).map((scenario) => `${config.users[0]}在${scenario}场景下缺少高效工具`),
        platform_options: config.platforms,
        monetization_options: baseModels,
        tags: unique([source.domain, ...capabilities]),
      };
    });
  });

const makeBundles = (capabilities) => {
  const bundles = [];
  for (let index = 0; index < capabilities.length; index++) {
    bundles.push(unique([capabilities[index], capabilities[(index + 1) % capabilities.length], capabilities[(index + 2) % capabilities.length]]));
    bundles.push(unique([capabilities[index], capabilities[(index + 3) % capabilities.length]]));
  }
  return bundles.slice(0, 14);
};

const platformType = (platform) => {
  if (platform === '数据看板') return 'dashboard';
  if (platform === '纯后端API服务') return 'backend';
  if (platform === '界面应用') return 'frontend';
  return '应用';
};

const sourceAtomsFor = (atoms, domain, bundle) => {
  const domainAtoms = atoms.filter((atom) => atom.business_domain === domain);
  const matched = domainAtoms.filter((atom) => hasOverlap(atom.capabilities, bundle));
  return (matched.length ? matched : domainAtoms).slice(0, 8);
};

const buildName = ({ user, scenario, platform }) => `${user}${scenario}${platform.replace('全栈', '').replace('应用', '')}`;

const buildCandidatesForDomain = (atoms, source) => {
  const config = domainConfigs[source.domain];
  const bundles = makeBundles(config.capabilities);
  const combos = [];

  for (const scenario of config.scenarios) {
    for (const user of config.users) {
      for (const platform of config.platforms) {
        for (const bundle of bundles) {
          for (const model of baseModels) {
            for (const complexity of baseComplexities) {
              const key = [source.domain, scenario, user, platform, bundle.join('+'), model, complexity].join('|');
              combos.push({ key, bucket: [scenario, platformType(platform), user].join('|'), scenario, user, platform, bundle, model, complexity });
            }
          }
        }
      }
    }
  }

  const byBucket = new Map();
  for (const combo of combos.sort((a, b) => hashText(a.key) - hashText(b.key))) {
    if (!byBucket.has(combo.bucket)) byBucket.set(combo.bucket, []);
    byBucket.get(combo.bucket).push(combo);
  }

  const selected = [];
  const buckets = [...byBucket.keys()].sort((a, b) => hashText(a) - hashText(b));
  while (selected.length < source.target && buckets.length) {
    let progressed = false;
    for (const bucket of buckets) {
      const combo = byBucket.get(bucket).shift();
      if (!combo) continue;
      selected.push(combo);
      progressed = true;
      if (selected.length >= source.target) break;
    }
    if (!progressed) break;
  }

  return selected.map((combo, index) => {
    const refs = sourceAtomsFor(atoms, source.domain, combo.bundle);
    const name = cleanGeneratedText(buildName(combo));
    return {
      id: `${source.key}_candidate_${String(index + 1).padStart(5, '0')}_${slugify(name)}`,
      business_domain: source.domain,
      name,
      target_user: combo.user,
      scenario: combo.scenario,
      product_form: combo.platform,
      core_pain_point: `${combo.user}在${combo.scenario}场景下需要更高效地管理${config.object}`,
      capability_bundle: combo.bundle,
      differentiation: `面向${combo.user}的${combo.scenario}工作流，围绕${combo.bundle.join('、')}形成可执行闭环`,
      monetization: combo.model,
      complexity: combo.complexity,
      domain_object: config.object,
      mvp_features: unique(['用户基础设置', ...combo.bundle.map((capability) => `${capability}模块`), `${combo.scenario}工作流`, '结果收藏与提醒', combo.complexity !== 'S' ? '统计与导出' : '']),
      pages: pagesByPlatform(combo.platform),
      data_models: dataModelsFor(source.domain, combo),
      reference_products: refs.map((atom) => cleanGeneratedText(atom.reference_product)),
      source_atom_ids: refs.map((atom) => atom.id),
    };
  });
};

const pagesByPlatform = (platform) => {
  if (platform === '界面应用') return ['首页', '列表页', '详情页', '收藏页', '设置页'];
  if (platform === '数据看板') return ['总览仪表盘', '趋势分析页', '筛选列表页', '报表导出页'];
  if (platform === '纯后端API服务') return ['API控制台', '接口文档页', '调用日志页', 'Key管理页'];
  return ['落地页', '仪表盘', '列表页', '详情页', '设置页'];
};

const dataModelsFor = (domain, candidate) => unique(['User', 'Item', 'Collection', 'Insight', 'Alert', domain === 'shopping' ? 'PriceSnapshot' : '', candidate.product_form === '纯后端API服务' ? 'ApiKey' : '']);

const promptTechStack = (candidate) => {
  if (candidate.product_form === '界面应用') return 'HTML/CSS/JavaScript 或 Next.js 项目';
  if (candidate.product_form === '数据看板') return 'Next.js + 图表组件 + mock API';
  if (candidate.product_form === '纯后端API服务') return 'Node.js API + OpenAPI 文档 + 简单控制台';
  return 'Next.js 或全栈 应用 项目，优先保证本地可运行';
};

const personaFamilies = [
  { persona: '产品经理', subtones: ['早期探索型', 'PRD需求型', '用户旅程型', '增长实验型', '竞品拆解型', '版本迭代型', '数据指标型', '老板汇报型'] },
  { persona: '创业者', subtones: ['想法验证型', '融资路演型', '低成本试错型', '商业闭环型', '独立开发型', '冷启动型', '垂直人群型', '差异化定位型'] },
  { persona: '技术负责人', subtones: ['工程落地型', '架构约束型', '模块拆分型', '可维护性型', '接口预留型', '本地优先型', '性能关注型', '交付验收型'] },
  { persona: '非技术老板', subtones: ['口语描述型', '结果导向型', '看起来真实型', '快速起步型', '成本敏感型', '生意机会型', '简单直接型', '对标竞品型'] },
  { persona: '运营负责人', subtones: ['活动转化型', '用户留存型', '内容运营型', '社群运营型', '数据复盘型', '流程提效型', '增长漏斗型', '用户分层型'] },
  { persona: '数据分析师', subtones: ['指标看板型', '趋势分析型', '异常预警型', '报表导出型', '数据建模型', '筛选钻取型', '决策支持型', '可视化优先型'] },
  { persona: '设计负责人', subtones: ['体验优先型', '信息架构型', '界面质感型', '应用优先型', '组件系统型', '低保真转高保真型', '可用性测试型', '视觉差异型'] },
  { persona: '外包甲方', subtones: ['需求说明型', '验收标准型', '预算控制型', '先做第一版型', '页面明确型', '功能清单型', '周期紧张型', '可运行型'] },
  { persona: '独立开发者', subtones: ['一人开发型', '本地工具型', '轻量实现型', '可应用工具型', '先跑通型', '少依赖型', '开源项目型', '快速上线型'] },
  { persona: '电商卖家', subtones: ['店铺经营型', '竞品监控型', '转化优化型', '利润计算型', '客服提效型', '商品管理型', '促销策略型', '复购增长型'] },
  { persona: '内容创作者', subtones: ['选题灵感型', '内容增长型', '粉丝互动型', '素材管理型', '发布流程型', '数据复盘型', '变现型', '跨平台型'] },
  { persona: '普通用户', subtones: ['生活问题型', '省时间型', '省钱型', '提醒我型', '简单好用型', '不懂技术型', '个人习惯型', '应用使用型'] },
  { persona: '研究员', subtones: ['资料整理型', '知识库型', '趋势观察型', '来源追踪型', '证据引用型', '摘要对比型', '专题监控型', '报告生成型'] },
  { persona: '客服主管', subtones: ['工单提效型', '自动回复型', '质量检查型', '客户分层型', 'SLA提醒型', '知识库型', '协作流转型', '满意度型'] },
  { persona: '市场负责人', subtones: ['品牌监测型', '投放复盘型', '竞品活动型', '线索转化型', '内容分发型', '渠道对比型', 'ROI型', '增长实验型'] },
  { persona: '个人效率用户', subtones: ['自动化型', '清单管理型', '提醒型', '信息聚合型', '少打扰型', '快捷入口型', '浏览器增强型', '习惯养成型'] },
  { persona: '企业内训负责人', subtones: ['培训管理型', '学习路径型', '员工追踪型', '考核反馈型', '材料整理型', '知识沉淀型', '低门槛型', '管理看板型'] },
  { persona: '社区管理员', subtones: ['成员管理型', '互动提升型', '内容审核型', '活动组织型', '通知触达型', '积分激励型', '数据看板型', '自动化运营型'] },
  { persona: '投资观察者', subtones: ['趋势洞察型', '机会扫描型', '竞品追踪型', '市场地图型', '风险提示型', '数据报告型', '轻量调研型', '行业监控型'] },
  { persona: '学生用户', subtones: ['作业辅助型', '低预算型', '学习计划型', '资料整理型', '提醒打卡型', '轻量工具型', '应用优先型', '简单直接型'] },
];

const promptIntents = ['想法验证', '产品需求', '工程实现', '竞品启发', '内部工具', '快速起步', '商业化SaaS', '浏览器应用工具', '数据看板', 'AI增强', '自动化提效', '个人自用'];
const detailLevels = ['brief', 'normal', 'detailed', 'engineering'];
const openingStyles = [
  (c) => `我想做一个${c.name}，先做成本地能跑的版本。`,
  (c) => `帮我实现一个${c.name}，目标是先把核心流程做通。`,
  (c) => `做一个面向${c.target_user}的工具，主要解决${c.scenario}这个场景。`,
  (c) => `我准备验证一个${c.business_domain}方向的产品，名字可以先用${c.name}。`,
  (c) => `参考现有同类工具的能力，做一个新的${c.name}，不要照抄品牌和界面。`,
  (c) => `我们团队需要一个${c.name}来处理${c.scenario}相关的日常流程。`,
  (c) => `请直接生成一个${c.name}的完整项目，重点是把真实业务闭环跑通。`,
  (c) => `我有个产品想法，名字先叫${c.name}，希望先做一个本地可运行的第一版。`,
  (c) => `从用户视角出发，做一个${c.name}，让${c.target_user}能更快完成${c.scenario}。`,
  (c) => `以${c.target_user}的真实使用场景为核心，生成一个${c.name}项目。`,
];
const constraintLines = [
  '先不要接真实第三方接口，用 mock 数据把流程跑通即可。',
  '数据可以先写死，但代码结构要方便后面替换成真实 API。',
  '重点是页面和流程像真实产品，而不是只有几个静态卡片。',
  '请把核心路径做完整，细节可以简化。',
  '需要包含 README，告诉我怎么启动、主要功能在哪里、后续怎么应用工具。',
  'UI 不需要过度复杂，但要有真实产品的层次和状态反馈。',
  '如果涉及分析、推荐或提醒，请用 mock 数据展示几种典型结果。',
  '尽量减少外部依赖，保证本地运行顺利。',
  '保留清晰的模块拆分，方便后续继续迭代。',
  '请直接产出代码，不要只给方案说明。',
];

const allToneContexts = personaFamilies.flatMap((family) =>
  family.subtones.flatMap((subtone) =>
    promptIntents.flatMap((intent) =>
      detailLevels.map((detail) => ({
        persona: family.persona,
        subtone,
        intent,
        detail,
        tone_id: `${family.persona}-${subtone}-${intent}-${detail}`,
      }))
    )
  )
);

const pickToneContext = (candidate, index) => pick(allToneContexts, hashText(`${candidate.id}-${index}`));
const pickLine = (items, seed) => pick(items, hashText(seed));

const compactJoin = (items, limit = 4) => items.slice(0, limit).join('、');

const buildCommon = (candidate, context) => ({
  capabilities: candidate.capability_bundle.join('、'),
  pages: candidate.pages.join('、'),
  shortPages: compactJoin(candidate.pages, 4),
  models: candidate.data_models.join('、'),
  refs: candidate.reference_products.slice(0, 5).join('、') || '同类产品',
  features: candidate.mvp_features.join('、'),
  shortFeatures: compactJoin(candidate.mvp_features, 5),
  stack: promptTechStack(candidate),
  constraint: pickLine(constraintLines, `${candidate.id}-constraint-${context.tone_id}`),
});

const renderers = [
  {
    id: 'background_first',
    render: (c, x, m) => `${c.target_user}在${c.scenario}时，经常需要处理${c.domain_object}，但现有流程太分散。围绕这个场景做一个${c.name}。

核心能力放在${m.capabilities}上，先把用户从进入产品、添加或查看对象、得到结果、再收藏/提醒/导出的链路做完整。数据可以先 mock，但体验要像真实产品。

页面可以从${m.shortPages}开始，功能先覆盖${m.shortFeatures}。用 ${m.stack} 实现，最后给 README，说明启动方式和后续如何接真实接口。`,
  },
  {
    id: 'rough_idea',
    render: (c, x, m) => `有个产品想法，名字先叫${c.name}，先做成本地可运行的第一版。

主要给${c.target_user}用，解决${c.core_pain_point}。不需要一开始就接真实平台，先用假数据把${c.scenario}这条流程跑通。重点功能是${m.capabilities}，界面别太简陋，至少要能看出这是一个可用工具。

如果可以，顺手把${m.shortPages}这些页面搭出来，README 写清楚怎么运行。`,
  },
  {
    id: 'pm_story',
    render: (c, x, m) => `做一个${c.name}。用户画像是${c.target_user}，核心使用场景是${c.scenario}。

当用户需要管理${c.domain_object}时，可以进入产品完成录入、查看、分析、提醒和后续管理。第一版先把${m.capabilities}做出来，不追求大而全，但要有一条顺畅的主路径。

页面可以自然地围绕${m.pages}展开，数据对象大致按${m.models}来组织。先用 mock 数据，后续再替换真实 API。`,
  },
  {
    id: 'task_ticket',
    render: (c, x, m) => `${c.name}先做一个本地可运行版本，主要给${c.target_user}在${c.scenario}时使用。

核心放在${m.capabilities}。用户最好能从查看或添加${c.domain_object}开始，看到系统给出的结果，然后继续收藏、提醒或导出，形成一条完整流程。

页面可以先做${m.shortPages}。数据 mock 出几组典型情况即可，代码结构保持清晰，最后补一份 README 说明怎么运行。`,
  },
  {
    id: 'competitor_light',
    render: (c, x, m) => `参考${m.refs}这类产品解决问题的方式，做一个新的${c.name}。

不要照搬品牌和 UI。这个项目面向${c.target_user}，聚焦${c.scenario}，更强调${m.capabilities}。先做一个本地可跑的原型，用 mock 数据展示完整流程。

页面可以包括${m.shortPages}，商业模式可以先按${c.monetization}预留一些入口或限制。`,
  },
  {
    id: 'nontech_boss',
    render: (c, x, m) => `需要一个看起来像真实产品的工具，名字先叫${c.name}。

给${c.target_user}用，主要就是解决${c.scenario}这件事。先不用真的接接口，数据造几组就行，但页面要能点、能看结果、能收藏或导出，不能只是空页面。

核心能力放在${m.capabilities}。做完后告诉我怎么运行。`,
  },
  {
    id: 'engineering_acceptance',
    render: (c, x, m) => `实现 ${c.name}，本地运行优先。

技术上可以用 ${m.stack}。数据层先 mock，后续要能替换成真实接口。核心数据模型可以按${m.models}拆分。

最后主要看三件事。第一，${c.target_user}能完成${c.scenario}的主流程；第二，${m.capabilities}不是摆设，要能在页面中体现；第三，README 写清楚启动、目录和应用工具方式。`,
  },
  {
    id: 'internal_tool',
    render: (c, x, m) => `内部先需要一个小工具来处理${c.scenario}，目标用户按${c.target_user}考虑，项目名用${c.name}。

工具里要能维护${c.domain_object}，并围绕${m.capabilities}给出分析、提醒或处理结果。先不上复杂权限，先把核心页面和 mock 数据做出来。

页面优先做${m.shortPages}。如果有时间，把${c.monetization}相关的套餐或额度提示也简单体现一下。`,
  },
  {
    id: 'data_view',
    render: (c, x, m) => `${c.scenario}这个场景需要一个更清楚的可视化工具。

请做一个${c.name}，给${c.target_user}使用。重点不是堆功能，而是把${c.domain_object}整理成可查看、可筛选、可追踪的界面。核心能力包括${m.capabilities}。

用 mock 数据做出列表、详情、指标或趋势结果。页面可参考${m.pages}。项目能本地启动，附 README。`,
  },
  {
    id: 'extension_focus',
    render: (c, x, m) => `${c.name}尽量做得轻量一些。

使用时最好能快速进入${c.scenario}流程，帮助${c.target_user}处理${c.domain_object}。先实现${m.capabilities}，数据可以 mock。界面重点放在快速查看结果、保存重点信息、设置提醒或导出。

技术栈用 ${m.stack}。代码里把数据获取和 UI 展示拆开，方便以后接真实来源。`,
  },
  {
    id: 'founder_validation',
    render: (c, x, m) => `${c.business_domain}方向想先验证一个机会，名字先用${c.name}。

目标人群是${c.target_user}。如果他们在${c.scenario}里确实有${c.core_pain_point}，这个工具应该能帮他们更快得到结果。第一版只要证明价值，不需要复杂后端。

请先把${m.shortFeatures}这些功能做出来。参考方向有${m.refs}，但不要复制。`,
  },
  {
    id: 'outsourcing_clear',
    render: (c, x, m) => `请做一个可以本地运行的 ${c.name}。

第一版功能做到${m.shortFeatures}。页面包括${m.shortPages}。目标用户是${c.target_user}，业务场景是${c.scenario}。

交付物需要能本地运行，包含 mock 数据和 README。不要依赖真实第三方账号。后续如果要接 API，代码结构要能继续应用工具。`,
  },
  {
    id: 'user_problem',
    render: (c, x, m) => `${c.target_user}现在缺一个顺手的工具来处理${c.scenario}。

做一个${c.name}，打开后能围绕${c.domain_object}快速看到关键信息。核心是${m.capabilities}。第一版不用复杂，能跑通主流程就好，用户可以输入或选择对象，查看结果，再保存、提醒或导出。

用 ${m.stack}，mock 数据即可。`,
  },
  {
    id: 'prd_compact',
    render: (c, x, m) => `${c.name}可以按一个小而完整的产品来做，面向${c.target_user}，核心是解决${c.core_pain_point}。

主流程不要复杂，用户管理${c.domain_object}，通过${m.capabilities}得到结果，再继续收藏、提醒或导出。页面可以安排成${m.pages}，数据结构大致围绕${m.models}。

${m.constraint} 最后直接给完整项目代码和 README。`,
  },
  {
    id: 'ops_flow',
    render: (c, x, m) => `围绕${c.scenario}做一个能提升日常效率的工具，名字先叫${c.name}。

它应该服务${c.target_user}，把${c.domain_object}的查看、整理、判断和后续动作串起来。能力重点是${m.capabilities}。页面不需要很多，但每个页面要有明确用途。

先用 mock 数据做，最好能看到几组不同状态的示例。完成后给出运行说明。`,
  },
  {
    id: 'question_style',
    render: (c, x, m) => `能不能做一个${c.name}？

设想是${c.target_user}在${c.scenario}时，把${c.domain_object}放进来，系统根据${m.capabilities}给出结果，再让用户继续收藏、提醒、导出或管理。

先做成本地可运行的版本就行，页面可以从${m.shortPages}开始。数据用 mock，README 写清楚怎么启动。`,
  },
];

const pickRenderer = (candidate, context, index) => pick(renderers, hashText(`${candidate.id}-${context.tone_id}-${index}`));

const buildPrompt = (candidate, index) => {
  const context = pickToneContext(candidate, index);
  const common = buildCommon(candidate, context);
  return cleanGeneratedText(pickRenderer(candidate, context, index).render(candidate, context, common));
};

const buildPrompts = (candidates) =>
  candidates.map((candidate, index) => {
    const context = pickToneContext(candidate, index);
    return {
      id: `prompt_${String(index + 1).padStart(5, '0')}_${candidate.id}`,
      candidate_id: candidate.id,
      business_domain: candidate.business_domain,
      name: cleanGeneratedText(candidate.name),
      target_user: candidate.target_user,
      scenario: candidate.scenario,
      product_form: cleanGeneratedText(candidate.product_form),
      capability_bundle: candidate.capability_bundle,
      monetization: candidate.monetization,
      complexity: candidate.complexity,
      prompt_persona: context.persona,
      prompt_subtone: context.subtone,
      prompt_intent: context.intent,
      prompt_detail: context.detail,
      prompt_tone_id: context.tone_id,
      status: 'draft',
      prompt: buildPrompt(candidate, index),
    };
  });

const buildRecipes = () =>
  Object.entries(domainConfigs).flatMap(([domain, config]) =>
    config.scenarios.map((scenario, index) => ({
      id: `${slugify(domain)}_recipe_${String(index + 1).padStart(2, '0')}_${slugify(scenario)}`,
      business_domain: domain,
      name: scenario,
      user_segments: config.users,
      platform_options: config.platforms,
      capability_options: config.capabilities,
    }))
  );

const main = () => {
  ensureDir(NORMALIZED_DIR);
  ensureDir(GENERATED_DIR);

  const atoms = buildProductAtoms(sourceFiles);
  const candidates = sourceFiles.flatMap((source) => buildCandidatesForDomain(atoms, source));
  const prompts = buildPrompts(candidates);
  const config = { source_files: sourceFiles, domains: domainConfigs, business_models: baseModels, complexities: baseComplexities };

  writeJson(path.join(NORMALIZED_DIR, 'product_atoms.json'), atoms);
  writeJson(path.join(GENERATED_DIR, 'multi_domain_prompt_factory_config.json'), config);
  writeJson(path.join(GENERATED_DIR, 'shopping_prompt_factory_config.json'), config);
  writeJson(path.join(GENERATED_DIR, 'scenario_recipes.json'), buildRecipes());
  writeJson(path.join(GENERATED_DIR, 'zero_to_one_candidates.json'), candidates);
  writeJson(path.join(GENERATED_DIR, 'generation_prompts.json'), prompts);

  console.log(`Generated ${atoms.length} product atoms`);
  console.log(`Generated ${Object.keys(domainConfigs).length} domains`);
  console.log(`Generated ${candidates.length} zero-to-one candidates`);
  console.log(`Generated ${prompts.length} generation prompts`);
};

main();
