#!/usr/bin/env python3
import json
import os
import re
import tomllib
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCAN_ROOT = Path('/Users/chen/Desktop/Cursor_project')
GENERATED = ROOT / 'data' / 'generated'
INVENTORY_FILE = GENERATED / 'local_project_inventory.json'
REPORT_FILE = GENERATED / 'local_project_review_report.md'
PROMPTS_FILE = GENERATED / 'generation_prompts.json'
CANDIDATES_FILE = GENERATED / 'zero_to_one_candidates.json'
STATE_FILE = GENERATED / 'prompt_state.json'

DOMAIN = 'local_projects'
PREFIX = 'xm'
PROMPT_SUFFIX = '按照需求功能的顺序，每一轮都优先考虑搭建核心功能，在逐步的考虑其他功能。'
MAX_PROJECTS = None
MAX_DEPTH = 5

IGNORE_DIRS = {
  '.git', '.hg', '.svn', '.next', '.nuxt', '.venv', 'venv', 'env', 'node_modules',
  'dist', 'build', 'target', '__pycache__', '.pytest_cache', '.turbo', '.cache',
}
PROJECT_MARKERS = {
  'package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'pom.xml',
  'README.md', 'README.zh-CN.md', 'vite.config.ts', 'vite.config.js',
  'next.config.js', 'next.config.mjs',
}
CODE_EXTENSIONS = {
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java',
  '.kt', '.swift', '.vue', '.svelte', '.html', '.css', '.scss', '.sql',
}

BUSINESS_MODELS = ['订阅席位', '私有化部署', '用量计费', '项目模板售卖', '企业集成费', '审计报告付费']
COMPLEXITIES = ['M', 'L', 'L']
PERSONAS = ['技术负责人', '产品经理', '运营负责人', '独立开发者', '外包甲方', '交付负责人']
SUBTONES = ['代码审视型', '复杂业务型', '验收清晰型', '接口预留型', '本地优先型', '风险闭环型']
INTENTS = ['代码资产盘点', '业务重构', '流程编排', '验收驱动', '异常排查', '交付改造']
DETAILS = ['detailed', 'engineering']

ARCHETYPE_BY_KEYWORD = [
  ('paper|research|论文|autoresearch', ('研究资料管线', '研究员', '资料采集、引用核验、版本归档和报告生成')),
  ('boss|job|招聘|parttime|order', ('岗位线索运营台', '运营负责人', '线索采集、去重、跟进、通知和风险标注')),
  ('video|drama|manga|TypeTale|aimanga', ('内容生产排期台', '内容团队', '素材导入、脚本生成、审稿、发布排期和版权留痕')),
  ('crawler|crawl|spider|scrape', ('采集任务治理台', '数据运营', '任务编排、反爬失败、代理池、重试和结果校验')),
  ('agent|claude|codex|openclaw|rpa', ('Agent 工作流控制台', 'AI 工具团队', '任务编排、权限隔离、执行日志、回滚和人工接管')),
  ('chat|message|notification|wecom|openim', ('消息协同调度台', '客服主管', '多渠道消息、去重、优先级、SLA 和交接记录')),
  ('frontend|ui|extension|web|vite|next', ('前端体验实验台', '产品经理', '页面状态、组件复用、接口 mock、异常态和发布检查')),
  ('backend|server|api', ('接口服务审计台', '技术负责人', '接口契约、权限、队列、日志、失败重试和压测')),
  ('mobile|android|ios', ('移动端交付诊断台', '移动团队', '设备适配、权限、离线缓存、崩溃记录和发布包检查')),
]


def read_json(path, fallback):
  try:
    with path.open(encoding='utf-8') as file:
      return json.load(file)
  except FileNotFoundError:
    return fallback


def write_json(path, payload):
  path.parent.mkdir(parents=True, exist_ok=True)
  with path.open('w', encoding='utf-8') as file:
    json.dump(payload, file, ensure_ascii=False, indent=2)
    file.write('\n')


def slugify(value):
  text = re.sub(r'[™®★()\[\]:,，。、&/]+', ' ', str(value).lower())
  text = re.sub(r'[^a-z0-9\u4e00-\u9fa5]+', '-', text).strip('-')
  return text[:90] or 'local-project'


def rel_to_scan(path):
  return str(path.relative_to(SCAN_ROOT))


def depth(path):
  return len(path.relative_to(SCAN_ROOT).parts)


def has_marker(path):
  try:
    names = {child.name for child in path.iterdir() if child.is_file()}
  except OSError:
    return False
  return bool(names & PROJECT_MARKERS)


def discover_project_roots():
  roots = []
  for current, dirs, _files in os.walk(SCAN_ROOT):
    current_path = Path(current)
    dirs[:] = [name for name in dirs if name not in IGNORE_DIRS and not name.startswith('.Trash')]
    if depth(current_path) > MAX_DEPTH:
      dirs[:] = []
      continue
    if has_marker(current_path):
      roots.append(current_path)
  unique = []
  seen = set()
  for path in sorted(roots, key=lambda item: (depth(item), str(item))):
    key = str(path)
    if key not in seen:
      unique.append(path)
      seen.add(key)
  return unique[:MAX_PROJECTS] if MAX_PROJECTS else unique


def read_text(path, limit=4000):
  try:
    return path.read_text(encoding='utf-8', errors='ignore')[:limit]
  except OSError:
    return ''


def package_summary(path):
  package_file = path / 'package.json'
  if not package_file.exists():
    return {}
  try:
    payload = json.loads(package_file.read_text(encoding='utf-8'))
  except Exception:
    return {'package_parse_error': True}
  deps = list((payload.get('dependencies') or {}).keys())
  dev_deps = list((payload.get('devDependencies') or {}).keys())
  scripts = sorted((payload.get('scripts') or {}).keys())
  return {
    'package_name': payload.get('name'),
    'package_description': payload.get('description'),
    'scripts': scripts[:12],
    'dependencies': deps[:20],
    'dev_dependencies': dev_deps[:16],
  }


def pyproject_summary(path):
  pyproject_file = path / 'pyproject.toml'
  if not pyproject_file.exists():
    return {}
  try:
    payload = tomllib.loads(pyproject_file.read_text(encoding='utf-8'))
  except Exception:
    return {'pyproject_parse_error': True}
  project = payload.get('project') or {}
  poetry = (payload.get('tool') or {}).get('poetry') or {}
  deps = project.get('dependencies') or poetry.get('dependencies') or []
  if isinstance(deps, dict):
    deps = list(deps.keys())
  return {
    'python_name': project.get('name') or poetry.get('name'),
    'python_description': project.get('description') or poetry.get('description'),
    'python_dependencies': [str(item) for item in deps[:20]],
  }


def code_summary(path):
  counts = Counter()
  total_files = 0
  for current, dirs, files in os.walk(path):
    dirs[:] = [name for name in dirs if name not in IGNORE_DIRS]
    if depth(Path(current)) - depth(path) > 4:
      dirs[:] = []
      continue
    for name in files:
      ext = Path(name).suffix
      if ext in CODE_EXTENSIONS:
        counts[ext] += 1
        total_files += 1
  return {
    'code_files': total_files,
    'top_extensions': counts.most_common(8),
  }


def detect_stack(meta):
  haystack = ' '.join([
    meta.get('name', ''),
    meta.get('readme_excerpt', ''),
    ' '.join(meta.get('dependencies', [])),
    ' '.join(meta.get('dev_dependencies', [])),
    ' '.join(meta.get('python_dependencies', [])),
    ' '.join(ext for ext, _count in meta.get('top_extensions', [])),
  ]).lower()
  stack = []
  for label, needles in [
    ('React', ['react', '.tsx', 'vite', 'next']),
    ('Vue', ['vue', '.vue']),
    ('Node.js', ['express', 'fastify', 'nestjs', 'node']),
    ('Python', ['python', 'fastapi', 'django', '.py']),
    ('Crawler', ['playwright', 'puppeteer', 'crawl', 'scrape']),
    ('AI/LLM', ['openai', 'anthropic', 'langchain', 'agent', 'claude', 'codex']),
    ('Mobile', ['android', 'ios', 'kotlin', 'swift']),
  ]:
    if any(needle in haystack for needle in needles):
      stack.append(label)
  return stack or ['未识别技术栈']


def choose_archetype(meta):
  haystack = f"{meta.get('relative_path', '')} {meta.get('name', '')} {meta.get('readme_excerpt', '')}".lower()
  for pattern, archetype in ARCHETYPE_BY_KEYWORD:
    if re.search(pattern, haystack):
      return archetype
  return ('项目资产治理台', '技术负责人', '代码资产、运行脚本、数据模型、任务状态和交付记录')


def project_inventory_item(path):
  readme = ''
  for name in ['README.md', 'README.zh-CN.md']:
    if (path / name).exists():
      readme = read_text(path / name, 1800)
      break
  meta = {
    'id': f"local_project_{slugify(rel_to_scan(path))}",
    'name': path.name,
    'absolute_path': str(path),
    'relative_path': rel_to_scan(path),
    'readme_excerpt': re.sub(r'\s+', ' ', readme).strip()[:900],
  }
  meta.update(package_summary(path))
  meta.update(pyproject_summary(path))
  meta.update(code_summary(path))
  meta['stack'] = detect_stack(meta)
  archetype, audience, objects = choose_archetype(meta)
  meta['business_archetype'] = archetype
  meta['target_user'] = audience
  meta['domain_object'] = objects
  return meta


def capability_bundle(meta):
  caps = ['代码资产盘点', '运行路径复核', '交付风险留痕']
  stack = set(meta.get('stack', []))
  if 'AI/LLM' in stack:
    caps[0] = 'Agent任务编排'
  if 'Crawler' in stack:
    caps[1] = '采集失败重试'
  if 'React' in stack or 'Vue' in stack:
    caps.append('前端异常态验收')
  if 'Python' in stack or 'Node.js' in stack:
    caps.append('接口契约校验')
  return list(dict.fromkeys(caps))[:4]


def make_candidate(meta, order):
  scenario = meta['business_archetype']
  caps = capability_bundle(meta)
  return {
    'id': f"{DOMAIN}_candidate_{order:04d}_{slugify(meta['relative_path'])}",
    'business_domain': DOMAIN,
    'name': f"{meta['name']} 项目业务重构器",
    'target_user': meta['target_user'],
    'scenario': scenario,
    'product_form': '本机项目审视工作台',
    'core_pain_point': f"{meta['target_user']}需要把本机项目 {meta['relative_path']} 的代码、运行方式、业务对象和交付风险整理成可执行任务。",
    'capability_bundle': caps,
    'differentiation': '直接基于本机项目资料生成业务化改造方案，要求有复杂状态、异常数据、验收路径和后续真实接口位置。',
    'monetization': BUSINESS_MODELS[order % len(BUSINESS_MODELS)],
    'complexity': COMPLEXITIES[order % len(COMPLEXITIES)],
    'domain_object': meta['domain_object'],
    'mvp_features': [
      '本机项目资料卡与代码结构摘要',
      '运行脚本和依赖风险检查',
      '复杂业务流程编排',
      '正常、边界、冲突、失败四类 mock 数据',
      '人工确认、撤销、历史记录和导出',
      'README、测试路径和真实接口预留说明',
    ],
    'pages': ['项目总览', '代码资料', '业务流程', '风险队列', '验收记录', '导出交付'],
    'data_models': ['LocalProject', 'CodeAsset', 'RunCommand', 'BusinessFlow', 'RiskFinding', 'ActionLog', 'ExportJob'],
    'reference_products': [meta['relative_path']],
    'source_atom_ids': [meta['id']],
    'local_project_path': meta['absolute_path'],
    'stack': meta['stack'],
  }


def make_prompt(candidate, meta, global_order):
  caps = '、'.join(candidate['capability_bundle'])
  stack = '、'.join(meta.get('stack') or ['未识别技术栈'])
  scripts = '、'.join(meta.get('scripts') or ['未发现 package scripts'])
  prompt = (
    f"基于我电脑上的本机项目 {meta['relative_path']}，先做一个本地可运行的{candidate['name']}。\n\n"
    f"你需要先把现有资料和代码当作输入：项目路径是 {meta['absolute_path']}，识别到的技术栈是 {stack}，可用脚本包括 {scripts}。"
    f"不要复制原项目页面，目标是把它重新设计成给{candidate['target_user']}使用的复杂业务工具。\n\n"
    f"业务场景是{candidate['scenario']}，业务对象包括{candidate['domain_object']}。核心能力是{caps}。"
    f"主流程必须覆盖：导入项目资料、审视代码结构、识别运行与交付风险、生成业务改造任务、人工确认或回滚、记录历史、导出验收包。\n\n"
    f"复杂样例必须包含：依赖缺失、脚本执行失败、接口返回脏数据、多人同时修改任务状态四类情况。"
    f"页面上要能看到异常原因、影响范围、处理建议、确认动作、撤销动作、操作日志和导出结果。\n\n"
    f"mock 数据需要有正常、边界、冲突、失败四组。README 写清启动方式、主要文件、测试路径、如何替换为真实项目扫描接口，以及后续接 Git/CI/任务系统的位置。\n\n"
    f"{PROMPT_SUFFIX}"
  )
  return {
    'id': f"prompt_{global_order:05d}_{candidate['id']}",
    'candidate_id': candidate['id'],
    'business_domain': DOMAIN,
    'name': candidate['name'],
    'target_user': candidate['target_user'],
    'scenario': candidate['scenario'],
    'product_form': candidate['product_form'],
    'capability_bundle': candidate['capability_bundle'],
    'monetization': candidate['monetization'],
    'complexity': candidate['complexity'],
    'prompt_persona': PERSONAS[global_order % len(PERSONAS)],
    'prompt_subtone': SUBTONES[global_order % len(SUBTONES)],
    'prompt_intent': INTENTS[global_order % len(INTENTS)],
    'prompt_detail': DETAILS[global_order % len(DETAILS)],
    'prompt_tone_id': f"{PERSONAS[global_order % len(PERSONAS)]}-{SUBTONES[global_order % len(SUBTONES)]}-{INTENTS[global_order % len(INTENTS)]}-{DETAILS[global_order % len(DETAILS)]}",
    'status': 'draft',
    'prompt': prompt,
    'global_order': global_order,
    'scene_folder': DOMAIN,
    'order_folder': str(global_order),
    'order_token': f'{PREFIX}-{global_order}',
  }


def write_report(items):
  stack_counts = Counter(stack for item in items for stack in item.get('stack', []))
  archetype_counts = Counter(item['business_archetype'] for item in items)
  lines = [
    '# 本机项目资料采集与代码审视报告',
    '',
    f'- 扫描根目录：`{SCAN_ROOT}`',
    f'- 收集项目数：`{len(items)}`',
    f'- 主要技术栈：{", ".join(f"{name}({count})" for name, count in stack_counts.most_common(12))}',
    f'- 主要业务改造方向：{", ".join(f"{name}({count})" for name, count in archetype_counts.most_common(12))}',
    '',
    '## 项目清单',
    '',
  ]
  for index, item in enumerate(items, 1):
    lines.append(f"{index}. `{item['relative_path']}` - {item['business_archetype']} - {', '.join(item['stack'])} - 代码文件 {item['code_files']}")
  REPORT_FILE.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def main():
  roots = discover_project_roots()
  items = [project_inventory_item(path) for path in roots]
  write_json(INVENTORY_FILE, items)
  write_report(items)

  prompts = [item for item in read_json(PROMPTS_FILE, []) if item.get('business_domain') != DOMAIN]
  candidates = [item for item in read_json(CANDIDATES_FILE, []) if item.get('business_domain') != DOMAIN]
  start_order = max([int(item.get('global_order') or 0) for item in prompts] or [0]) + 1

  new_candidates = []
  new_prompts = []
  for offset, meta in enumerate(items, 0):
    global_order = start_order + offset
    candidate = make_candidate(meta, offset + 1)
    prompt = make_prompt(candidate, meta, global_order)
    new_candidates.append(candidate)
    new_prompts.append(prompt)

  prompts.extend(new_prompts)
  candidates.extend(new_candidates)
  write_json(PROMPTS_FILE, prompts)
  write_json(CANDIDATES_FILE, candidates)

  state = read_json(STATE_FILE, {'completed': {}, 'orders': {}})
  state.setdefault('completed', {})
  state.setdefault('orders', {})
  valid_prompt_ids = {item.get('id') for item in prompts}
  state['completed'] = {key: value for key, value in state.get('completed', {}).items() if key in valid_prompt_ids}
  state['orders'] = {key: value for key, value in state.get('orders', {}).items() if key in valid_prompt_ids}
  write_json(STATE_FILE, state)

  print(json.dumps({
    'scan_root': str(SCAN_ROOT),
    'local_projects': len(items),
    'new_prompts': len(new_prompts),
    'total_prompts': len(prompts),
    'inventory': str(INVENTORY_FILE.relative_to(ROOT)),
    'report': str(REPORT_FILE.relative_to(ROOT)),
  }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
  main()
