#!/usr/bin/env python3
import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GENERATED_DIR = ROOT / 'data' / 'generated'
NORMALIZED_DIR = ROOT / 'data' / 'normalized'
PROMPTS_FILE = GENERATED_DIR / 'generation_prompts.json'
CANDIDATES_FILE = GENERATED_DIR / 'zero_to_one_candidates.json'
ATOMS_FILE = NORMALIZED_DIR / 'product_atoms.json'
STATE_FILE = GENERATED_DIR / 'prompt_state.json'
REPORT_FILE = GENERATED_DIR / 'curated_prompt_assets_report.json'

SOURCE_FILES = [
  ('shopping', 'data/chrome_web_store/shopping_extensions.json'),
  ('entertainment', 'data/chrome_web_store/entertainment/entertainment_extensions.json'),
  ('social', 'data/chrome_web_store/social/social_extensions.json'),
  ('travel', 'data/chrome_web_store/travel/travel_extensions.json'),
  ('game', 'data/chrome_web_store/game_extensions.json'),
  ('health', 'data/chrome_web_store/health/health_extensions.json'),
  ('home', 'data/chrome_web_store/home/home_extensions.json'),
  ('news_weather', 'data/chrome_web_store/news_weather/news_weather_extensions.json'),
  ('art_design', 'data/chrome_web_store/art_design_extensions.json'),
  ('fun_leisure', 'data/chrome_web_store/fun_leisure/fun_leisure_extensions.json'),
]

DOMAIN_KITS = {
  'shopping': {
    'audiences': ['跨境买手', '企业采购', '高频网购者', '电商卖家', '品牌控价员', '省钱用户'],
    'objects': '商品、价格、优惠、库存、评论、订单和店铺',
    'forms': ['价格追踪器', '优惠核验器', '采购对账助手', '评论风险复核台', '库存预警器', '结账试算器'],
    'scenarios': ['价格追踪', '优惠核销', '采购对账', '评论复核', '库存预警', '结账校验'],
  },
  'entertainment': {
    'audiences': ['追剧用户', '播客剪辑', '直播房管', '影评作者', '音乐整理者', '家庭影音管家'],
    'objects': '内容条目、播放记录、弹幕、音轨、歌词、片单和成员',
    'forms': ['观影同步房', '弹幕处置台', '音轨修复器', '歌词校准器', '片单整理器', '观看记录迁移器'],
    'scenarios': ['同步观影', '弹幕治理', '音轨校准', '歌词对齐', '片单整理', '进度迁移'],
  },
  'social': {
    'audiences': ['社群运营', '品牌社媒', '内容创作者', '粉丝群管理员', '私域客服', '邮件重度使用者'],
    'objects': '账号、内容、粉丝、评论、消息、素材和互动事件',
    'forms': ['评论处置队列', '内容同步补偿器', '粉丝分层台账', '私域触达编排器', '消息去重器', '素材授权簿'],
    'scenarios': ['评论分流', '内容同步', '粉丝分层', '私域触达', '消息去重', '素材授权'],
  },
  'travel': {
    'audiences': ['自由行规划者', '商务差旅', '家庭出游组织者', '背包客', '旅行博主', '机票比价员'],
    'objects': '行程、航班、酒店、预算、签证材料、天气、路线和地点',
    'forms': ['行程重排器', '机酒价格追踪器', '签证材料核验单', '旅行预算偏差簿', '天气改线助手', '路线冲突解算器'],
    'scenarios': ['行程重排', '机酒追价', '签证核验', '预算偏差', '天气改线', '路线优化'],
  },
  'game': {
    'audiences': ['Steam玩家', '硬核玩家', '手游队长', '游戏主播', '电竞领队', 'MOD作者'],
    'objects': '游戏、玩家、队伍、战绩、成就、MOD、赛事、价格和攻略',
    'forms': ['战绩复盘器', '组队规则器', 'MOD依赖检查器', '折扣历史追踪器', '赛事时区排程器', '攻略版本校验册'],
    'scenarios': ['战绩复盘', '组队匹配', 'MOD冲突', '折扣追踪', '赛事排程', '攻略校验'],
  },
  'health': {
    'audiences': ['慢病随访员', '家庭照护者', '医生助理', '营养师', '睡眠改善者', '康复训练师'],
    'objects': '用户档案、体征记录、用药计划、饮食运动、睡眠、随访任务和风险提示',
    'forms': ['用药补救助手', '康复随访工作台', '营养复盘器', '睡眠干预记录器', '风险分层引擎', '健康报告校验器'],
    'scenarios': ['用药补救', '康复随访', '饮食复盘', '睡眠干预', '风险分层', '报告复核'],
  },
  'home': {
    'audiences': ['租房住户', '房东', '物业维修', '装修业主', '家庭采购', '智能家居管家'],
    'objects': '房间、设备、耗材、账单、维修记录、家庭成员、预算和采购清单',
    'forms': ['维修报价复核台', '设备履历册', '装修预算变更簿', '耗材补货助手', '账单分摊校验器', '家务排班调度器'],
    'scenarios': ['维修报价', '设备保养', '预算追加', '耗材补货', '账单分摊', '家务排班'],
  },
  'news_weather': {
    'audiences': ['新闻编辑', '投资观察者', '天气敏感人群', '研究员', '户外作业者', '事实核查员'],
    'objects': '信息源、主题、事件、地点、天气预警、引用证据、订阅和简报任务',
    'forms': ['来源评分器', '新闻合并流', '事实核查证据包', '天气预警分发器', '本地事件提醒器', '简报审阅单'],
    'scenarios': ['来源巡检', '新闻去重', '事实核查', '天气预警', '本地事件', '简报审阅'],
  },
  'art_design': {
    'audiences': ['品牌设计师', '电商美工', '插画师', '摄影修图师', '自媒体运营', '设计审稿人'],
    'objects': '图片、图层、色板、品牌素材、审稿意见、授权信息和导出规格',
    'forms': ['素材授权簿', '批量导出管线', '配色复核器', '图片去重采集器', '审稿流转单', '交付打包器'],
    'scenarios': ['素材授权', '批量导出', '色彩复核', '图片去重', '审稿冲突', '交付命名'],
  },
  'fun_leisure': {
    'audiences': ['办公室减压者', '桌宠爱好者', '学生放松者', '动漫收藏者', '音乐电台听众', '休息提醒使用者'],
    'objects': '主题、互动事件、播放列表、休息计划、收藏、分享内容和用户偏好',
    'forms': ['休息节律调度器', '桌宠互动事件簿', '主题资源诊断器', '随机内容去重流', '音乐电台控制器', '偏好迁移包'],
    'scenarios': ['休息节律', '桌宠互动', '主题切换', '随机推荐', '音乐电台', '偏好迁移'],
  },
}

CAPABILITY_RULES = [
  ('AI辅助', ['ai', 'assistant', 'chat', 'gpt', '智能', 'summary', 'summar']),
  ('提醒预警', ['alert', 'notify', 'reminder', '提醒', '通知', 'alarm']),
  ('价格追踪', ['price', 'coupon', 'cashback', 'deal', '优惠', '价格', '折扣']),
  ('内容整理', ['bookmark', 'save', 'collection', 'playlist', '收藏', '整理']),
  ('导入导出', ['export', 'download', 'import', '导出', '下载', '导入']),
  ('同步协作', ['sync', 'share', 'team', 'collab', '同步', '分享', '协作']),
  ('质量检查', ['check', 'review', 'audit', '检测', '审核', '校验']),
  ('数据洞察', ['analytics', 'insight', 'stats', 'trend', '分析', '统计', '趋势']),
]
FALLBACK_CAPABILITIES = ['对象管理', '异常识别', '处理建议', '历史记录', '导出留痕']
DATA_CONDITIONS = ['缺字段', '重复记录', '失效链接', '过期规则', '缓存旧值', '时区偏差', '金额偏差', '状态漂移', '权限错配', '导出失败']
BUSINESS_CASES = ['批量处理失败', '来源不一致', '人工复核冲突', '阈值误报', '历史回填缺口', '多人编辑冲突', '结果不可解释', '任务超时']
PERSONAS = ['产品经理', '技术负责人', '运营负责人', '独立开发者', '外包甲方', '市场负责人', '客服主管', '研究员']
SUBTONES = ['验收清晰型', '本地优先型', '流程拆解型', '异常处理型', '证据留痕型', '接口预留型']
INTENTS = ['异常排查', '流程编排', '风控校验', '自动巡检', '合规留痕', '验收驱动']
DETAILS = ['brief', 'normal', 'detailed', 'engineering']
MONETIZATION = ['订阅席位', '项目模板售卖', '用量计费', '团队工作区', '审计报告付费', '专业版限制']
COMPLEXITY = ['S', 'M', 'L']


def read_json(path):
  with path.open(encoding='utf-8') as file:
    return json.load(file)


def write_json(path, payload):
  path.parent.mkdir(parents=True, exist_ok=True)
  with path.open('w', encoding='utf-8') as file:
    json.dump(payload, file, ensure_ascii=False, indent=2)
    file.write('\n')


def pick(items, seed):
  return items[seed % len(items)]


def clean(value):
  text = str(value or '').strip()
  replacements = {
    '数据看板': '指标诊断',
    '看板': '诊断台',
    '界面应用': '流程工具',
    '全栈应用': '本地应用',
    '界面': '交互流程',
    'Web': '应用',
    'web': '应用',
  }
  for old, new in replacements.items():
    text = text.replace(old, new)
  return text


def slugify(value):
  text = re.sub(r'[™®★()\[\]:,，。、&/]+', ' ', str(value).lower())
  text = re.sub(r'[^a-z0-9\u4e00-\u9fa5]+', '-', text).strip('-')
  return text[:90] or 'item'


def source_items(file_name):
  payload = read_json(ROOT / file_name)
  items = payload.get('items') or payload.get('extensions') or payload
  return items if isinstance(items, list) else []


def infer_capabilities(name, description, domain, seed):
  haystack = f'{name} {description}'.lower()
  caps = [label for label, keys in CAPABILITY_RULES if any(key.lower() in haystack for key in keys)]
  kit = DOMAIN_KITS[domain]
  caps.extend([pick(kit['scenarios'], seed), pick(FALLBACK_CAPABILITIES, seed + 2)])
  return list(dict.fromkeys(clean(cap) for cap in caps))[:3]


def unique_name(base, used, seed):
  base = clean(base).strip(' -_')
  if base and base not in used:
    used.add(base)
    return base
  while True:
    candidate = f'{base or "本地工具"}{pick(DATA_CONDITIONS, seed + len(used))}{pick(["复核", "巡检", "校验", "归因", "调度", "留痕"], seed)}'
    if candidate not in used:
      used.add(candidate)
      return candidate


def build_assets():
  atoms = []
  candidates = []
  prompts = []
  used_names = set()
  order = 1

  for domain, file_name in SOURCE_FILES:
    kit = DOMAIN_KITS[domain]
    for index, item in enumerate(source_items(file_name), 1):
      raw_name = clean(item.get('name', f'{domain}-{index}'))
      description = clean(item.get('description', ''))
      seed = order + index * 7 + len(raw_name)
      scenario = pick(kit['scenarios'], seed)
      form = pick(kit['forms'], seed + 3)
      audience = pick(kit['audiences'], seed + 5)
      condition = pick(DATA_CONDITIONS, seed + 11)
      business_case = pick(BUSINESS_CASES, seed + 13)
      capabilities = infer_capabilities(raw_name, description, domain, seed)
      product_name = unique_name(f'{raw_name} {scenario}{pick(["助手", "复核台", "处理器", "校验器", "工作流"], seed)}', used_names, seed)

      atom_id = f'{domain}_atom_{index:04d}_{slugify(raw_name)}'
      candidate_id = f'{domain}_candidate_{index:04d}_{slugify(product_name)}'
      atom = {
        'id': atom_id,
        'source': 'dataBak备份0424',
        'source_file': file_name,
        'source_category': domain,
        'source_index': item.get('index', index),
        'reference_product': raw_name,
        'rating': item.get('rating'),
        'raw_description': description,
        'business_domain': domain,
        'capabilities': capabilities,
      }
      candidate = {
        'id': candidate_id,
        'business_domain': domain,
        'name': product_name,
        'target_user': audience,
        'scenario': scenario,
        'product_form': form,
        'core_pain_point': f'{audience}在{scenario}时容易遇到{business_case}和{condition}，需要围绕原始产品能力做可复核流程',
        'capability_bundle': capabilities,
        'differentiation': f'参考 {raw_name} 的问题空间，但重做为本地可运行的{form}，重点处理异常、人工确认和导出留痕',
        'monetization': pick(MONETIZATION, seed),
        'complexity': pick(COMPLEXITY, seed),
        'domain_object': kit['objects'],
        'mvp_features': [
          f'{scenario}对象录入',
          f'{condition}校验',
          f'{business_case}识别',
          f'{capabilities[0]}执行',
          '人工确认与撤销',
          '历史记录与导出',
        ],
        'pages': ['任务入口', '对象清单', '处理详情', '规则设置', '历史记录', '导出结果'],
        'data_models': ['Actor', 'SourceItem', 'Rule', 'Finding', 'ActionLog', 'ExportJob'],
        'reference_products': [raw_name],
        'source_atom_ids': [atom_id],
        'business_complexity': {
          'source_description': description,
          'real_world_case': business_case,
          'data_condition': condition,
          'primary_flow': ['录入或导入对象', '校验关键字段', '识别异常与冲突', '给出处理建议', '人工确认或撤销', '导出结果与留痕'],
        },
      }
      persona = pick(PERSONAS, seed)
      subtone = pick(SUBTONES, seed + 1)
      intent = pick(INTENTS, seed + 2)
      detail = pick(DETAILS, seed + 3)
      prompt = {
        'id': f'prompt_{order:05d}_{candidate_id}',
        'candidate_id': candidate_id,
        'business_domain': domain,
        'name': product_name,
        'target_user': audience,
        'scenario': scenario,
        'product_form': form,
        'capability_bundle': capabilities,
        'monetization': candidate['monetization'],
        'complexity': candidate['complexity'],
        'prompt_persona': persona,
        'prompt_subtone': subtone,
        'prompt_intent': intent,
        'prompt_detail': detail,
        'prompt_tone_id': f'{persona}-{subtone}-{intent}-{detail}',
        'status': 'draft',
        'prompt': (
          f"基于原始参考产品 {raw_name}，重新设计一个本地可运行的 {product_name}。\n\n"
          f"不要复制原产品品牌、页面或文案，只借鉴它解决的问题。目标用户是{audience}，业务场景是{scenario}，"
          f"对象包括{kit['objects']}。\n\n"
          f"第一版做成{form}。核心能力是{'、'.join(capabilities)}。必须覆盖：录入或导入对象、校验关键字段、"
          f"识别异常与冲突、给出处理建议、人工确认或撤销、历史记录、导出结果。\n\n"
          f"复杂样例至少包含一组{condition}数据和一组{business_case}场景。mock 数据需要有正常、边界、冲突、失败四类。"
          f"README 写清启动方式、主要文件、测试路径和后续接真实接口的位置。"
        ),
        'global_order': order,
        'scene_folder': domain,
        'order_folder': str(order),
      }
      atoms.append(atom)
      candidates.append(candidate)
      prompts.append(prompt)
      order += 1

  return atoms, candidates, prompts


def main():
  atoms, candidates, prompts = build_assets()
  write_json(ATOMS_FILE, atoms)
  write_json(CANDIDATES_FILE, candidates)
  write_json(PROMPTS_FILE, prompts)
  write_json(STATE_FILE, {'completed': {}, 'orders': {}})

  report = {
    'source': 'dataBak备份0424 restored into data/',
    'product_atoms': len(atoms),
    'candidates': len(candidates),
    'prompts': len(prompts),
    'duplicate_names': len(prompts) - len({item['name'] for item in prompts}),
    'forbidden_terms_in_names': {
      term: sum(term in item['name'] for item in prompts)
      for term in ['数据看板', '看板', '界面应用', '全栈应用', '界面']
    },
    'domain_counts': Counter(item['business_domain'] for item in prompts),
    'top_forms': Counter(item['product_form'] for item in prompts).most_common(20),
  }
  write_json(REPORT_FILE, report)
  print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
  main()
