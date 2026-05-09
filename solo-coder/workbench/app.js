const rowsEl = document.getElementById('projectRows');
const detailPanel = document.getElementById('detailPanel');
const promptBackground = document.getElementById('promptBackground');
const promptFeatures = document.getElementById('promptFeatures');
const promptDelivery = document.getElementById('promptDelivery');
const statsBar = document.getElementById('statsBar');
const domainFilter = document.getElementById('domainFilter');
const userFilter = document.getElementById('userFilter');
const platformFilter = document.getElementById('platformFilter');
const scenarioFilter = document.getElementById('scenarioFilter');
const searchInput = document.getElementById('searchInput');
const sceneButtons = document.getElementById('sceneButtons');
const syncGithubAllButton = document.getElementById('syncGithubAll');
const githubRepoUrlInput = document.getElementById('githubRepoUrl');
const syncGithubStatus = document.getElementById('syncGithubStatus');
const feishuTaskUrlInput = document.getElementById('feishuTaskUrl');
const feishuClaimCountInput = document.getElementById('feishuClaimCount');
const claimFeishuTasksButton = document.getElementById('claimFeishuTasks');
const claimFeishuStatus = document.getElementById('claimFeishuStatus');
const sessionModal = document.getElementById('sessionModal');
const sessionMeta = document.getElementById('sessionMeta');
const sessionPrevButton = document.getElementById('sessionPrev');
const sessionNextButton = document.getElementById('sessionNext');
const sessionRows = document.getElementById('sessionRows');
const copySessionIdColumnButton = document.getElementById('copySessionIdColumn');
const copyDissatisfactionColumnButton = document.getElementById('copyDissatisfactionColumn');
const copyConversationColumnButton = document.getElementById('copyConversationColumn');
const copyLogTraceColumnButton = document.getElementById('copyLogTraceColumn');
const batchTraeInput = document.getElementById('batchTraeInput');
const batchOpenTraeButton = document.getElementById('batchOpenTrae');
const batchCloseTraeButton = document.getElementById('batchCloseTrae');
const batchTraeStatus = document.getElementById('batchTraeStatus');
const openBatchSessionsButton = document.getElementById('openBatchSessions');
const batchProjectList = document.getElementById('batchProjectList');
const batchGroupSelect = document.getElementById('batchGroupSelect');
const batchGroupNameInput = document.getElementById('batchGroupName');
const addToBatchGroupButton = document.getElementById('addToBatchGroup');
const saveBatchGroupButton = document.getElementById('saveBatchGroup');
const deleteBatchGroupButton = document.getElementById('deleteBatchGroup');
const batchSessionModal = document.getElementById('batchSessionModal');
const batchSessionMeta = document.getElementById('batchSessionMeta');
const batchSessionRows = document.getElementById('batchSessionRows');
const copyBatchOrderColumnButton = document.getElementById('copyBatchOrderColumn');
const copyBatchSessionIdColumnButton = document.getElementById('copyBatchSessionIdColumn');
const copyBatchDissatisfactionColumnButton = document.getElementById('copyBatchDissatisfactionColumn');
const copyBatchConversationColumnButton = document.getElementById('copyBatchConversationColumn');
const copyBatchLogTraceColumnButton = document.getElementById('copyBatchLogTraceColumn');

let candidates = [];
let prompts = [];
let atoms = [];
let promptState = { completed: {} };
let filteredPrompts = [];
let selectedPromptId = '';
let selectedParts = { background: '', features: '', delivery: '' };
let selectedBatchOrders = new Set();
let batchGroups = {};
let activeBatchGroup = '';
let currentSessionRows = [];
let sessionOrderList = [];
let activeSessionOrder = '';
let currentBatchSessionRows = [];
let sessionLoadRequestId = 0;
const refreshingSessionOrders = new Set();
const sessionRefreshPollTimers = new Map();
const sessionFetchTimeoutMs = 30000;
const sessionRefreshTimeoutMs = 42000;
let activeSessionFetchController = null;
const scenePrefix = {
  shopping: 'g',
  social: 's',
  entertainment: 'yl',
  travel: 'l',
  game: 'yx',
  health: 'jk',
  home: 'jj',
  news_weather: 'xw',
  art_design: 'ys',
  fun_leisure: 'qx',
  local_projects: 'xm',
};

const domainAliases = {
  '购物': 'shopping',
  '社交': 'social',
  '娱乐': 'entertainment',
  '旅游': 'travel',
  '游戏': 'game',
  '健康': 'health',
  '家居': 'home',
  '新闻与天气': 'news_weather',
  '艺术与设计': 'art_design',
  '趣味休闲': 'fun_leisure',
  '本机项目': 'local_projects',
};

const domainDisplayNames = {
  shopping: '购物',
  social: '社交',
  entertainment: '娱乐',
  travel: '旅游',
  game: '游戏',
  health: '健康',
  home: '家居',
  news_weather: '新闻与天气',
  art_design: '艺术与设计',
  fun_leisure: '趣味休闲',
  local_projects: '本机项目',
};

function normalizeDomainName(domain) {
  return domainAliases[domain] || domain || '';
}

function displayDomainName(domain) {
  const normalized = normalizeDomainName(domain);
  return domainDisplayNames[normalized] || domain || '';
}

function cell(text, className = '') {
  const td = document.createElement('td');
  td.textContent = text ?? '';
  if (className) td.className = className;
  return td;
}

function shortList(items, limit = 3) {
  if (!Array.isArray(items)) return '';
  const head = items.slice(0, limit).join(' / ');
  return items.length > limit ? `${head} / +${items.length - limit}` : head;
}

function isCompleted(promptId) {
  return Boolean(promptState.completed?.[promptId]);
}

function orderPrefix(prompt) {
  if (String(prompt?.id || '').startsWith('prd_300_may_')) return 'may';
  const domain = normalizeDomainName(prompt.business_domain);
  return scenePrefix[domain] || 'x';
}

function orderToken(prompt, value) {
  const prefix = orderPrefix(prompt);
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return `${prefix}-${value}`;
  }
  const text = String(value ?? '').trim();
  if (!text) return `${prefix}-${prompt.global_order}`;
  if (/^\d+$/.test(text)) return `${prefix}-${Number.parseInt(text, 10)}`;
  const match = text.match(/^([a-zA-Z]+)-(\d+)$/);
  if (match) return `${match[1].toLowerCase()}-${Number.parseInt(match[2], 10)}`;
  return text;
}

function orderNumber(value) {
  const text = String(value ?? '').trim();
  if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
  const match = text.match(/-(\d+)$/);
  if (match) return Number.parseInt(match[1], 10);
  return Number.NaN;
}

function orderPrefixRank(value) {
  const prefix = String(value ?? '').trim().split('-')[0].toLowerCase();
  if (prefix === 'may') return 0;
  if (prefix === 'xm') return 1;
  return 2;
}

function getOrder(prompt) {
  const raw = promptState.orders?.[prompt.id];
  return orderToken(prompt, raw || `${orderPrefix(prompt)}-${prompt.global_order}`);
}

function comparePromptOrder(a, b) {
  const orderA = getOrder(a);
  const orderB = getOrder(b);
  const numberA = orderNumber(orderA);
  const numberB = orderNumber(orderB);
  const prefixRankA = orderPrefixRank(orderA);
  const prefixRankB = orderPrefixRank(orderB);
  if (prefixRankA !== prefixRankB) return prefixRankA - prefixRankB;
  if (prefixRankA === 0 && Number.isInteger(numberA) && Number.isInteger(numberB) && numberA !== numberB) {
    return numberA - numberB;
  }
  const rank = (value) => {
    if (!Number.isInteger(value)) return 2;
    if (value > 555555) return 3;
    if (value < 1000) return 2;
    return 1;
  };
  const rankA = rank(numberA);
  const rankB = rank(numberB);
  if (rankA !== rankB) return rankA - rankB;
  if (Number.isInteger(numberA) && Number.isInteger(numberB) && numberA !== numberB) {
    return numberA - numberB;
  }
  return String(orderA).localeCompare(String(orderB), undefined, { numeric: true });
}

function parseBatchOrders() {
  return String(batchTraeInput?.value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBatchOrders(items) {
  const orders = [];
  const seen = new Set();
  for (const item of items || []) {
    let text = String(item || '').trim();
    if (!text) continue;
    if (/^\d+$/.test(text)) text = `xm-${Number.parseInt(text, 10)}`;
    const match = text.match(/^([a-zA-Z]+)-(\d+)$/);
    if (match) text = `${match[1].toLowerCase()}-${Number.parseInt(match[2], 10)}`;
    if (!seen.has(text)) {
      seen.add(text);
      orders.push(text);
    }
  }
  return orders;
}

function setBatchStatus(text, isError = false) {
  if (!batchTraeStatus) return;
  batchTraeStatus.textContent = text || '';
  batchTraeStatus.classList.toggle('error', Boolean(isError));
}

function currentBatchGroupName() {
  return String(batchGroupNameInput?.value || activeBatchGroup || '').trim();
}

function renderBatchGroups() {
  if (!batchGroupSelect) return;
  const previous = activeBatchGroup || batchGroupSelect.value;
  batchGroupSelect.innerHTML = '';
  const names = Object.keys(batchGroups).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = names.length ? '选择组' : '暂无组';
  batchGroupSelect.appendChild(empty);
  for (const name of names) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = `${name} (${normalizeBatchOrders(batchGroups[name]).length})`;
    batchGroupSelect.appendChild(option);
  }
  if (previous && names.includes(previous)) {
    batchGroupSelect.value = previous;
    activeBatchGroup = previous;
  } else if (names.length && !activeBatchGroup) {
    batchGroupSelect.value = names[0];
    activeBatchGroup = names[0];
  }
}

function loadBatchGroup(name) {
  activeBatchGroup = String(name || '').trim();
  if (batchGroupSelect) batchGroupSelect.value = activeBatchGroup;
  if (batchGroupNameInput) batchGroupNameInput.value = activeBatchGroup;
  if (batchTraeInput) batchTraeInput.value = normalizeBatchOrders(batchGroups[activeBatchGroup] || []).join(',');
  selectedBatchOrders = new Set();
  renderBatchProjectList();
}

async function fetchBatchGroups() {
  try {
    const response = await fetch('/api/trae-groups');
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '读取组失败');
    batchGroups = payload.groups || {};
    renderBatchGroups();
    if (activeBatchGroup && batchGroups[activeBatchGroup]) {
      loadBatchGroup(activeBatchGroup);
    } else if (Object.keys(batchGroups).length && !batchTraeInput?.value) {
      loadBatchGroup(Object.keys(batchGroups).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))[0]);
    }
  } catch (error) {
    setBatchStatus(`读取组失败：${error.message || error}`, true);
  }
}

async function saveBatchGroup(name, orders) {
  const groupName = String(name || '').trim();
  const normalizedOrders = normalizeBatchOrders(orders);
  if (!groupName) {
    setBatchStatus('请输入组名', true);
    batchGroupNameInput?.focus();
    return false;
  }
  if (!normalizedOrders.length) {
    setBatchStatus('组内没有项目', true);
    return false;
  }
  const response = await fetch('/api/trae-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', name: groupName, orders: normalizedOrders }),
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error || '保存组失败');
  batchGroups = payload.groups || {};
  activeBatchGroup = payload.active || groupName;
  renderBatchGroups();
  loadBatchGroup(activeBatchGroup);
  setBatchStatus(`已保存组 ${activeBatchGroup}：${normalizedOrders.length} 个项目`);
  return true;
}

async function deleteActiveBatchGroup() {
  const groupName = currentBatchGroupName();
  if (!groupName) {
    setBatchStatus('请选择要删除的组', true);
    return;
  }
  const response = await fetch('/api/trae-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', name: groupName }),
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error || '删除组失败');
  batchGroups = payload.groups || {};
  activeBatchGroup = '';
  renderBatchGroups();
  if (Object.keys(batchGroups).length) {
    loadBatchGroup(Object.keys(batchGroups).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))[0]);
  } else {
    if (batchGroupNameInput) batchGroupNameInput.value = '';
    if (batchTraeInput) batchTraeInput.value = '';
    selectedBatchOrders = new Set();
    renderBatchProjectList();
  }
  setBatchStatus(`已删除组 ${groupName}`);
}

async function addSelectionToActiveGroup() {
  const selected = normalizeBatchOrders(Array.from(selectedBatchOrders));
  if (!selected.length) {
    setBatchStatus('请先在列表中选择项目', true);
    return;
  }
  const existing = normalizeBatchOrders(parseBatchOrders());
  const merged = normalizeBatchOrders([...existing, ...selected]);
  if (batchTraeInput) batchTraeInput.value = merged.join(',');
  const groupName = currentBatchGroupName() || `组${Object.keys(batchGroups).length + 1}`;
  if (batchGroupNameInput) batchGroupNameInput.value = groupName;
  await saveBatchGroup(groupName, merged);
  selectedBatchOrders = new Set();
  renderBatchProjectList();
}

function syncBatchInputFromSelection() {
  if (!batchTraeInput) return;
  const selected = normalizeBatchOrders(Array.from(selectedBatchOrders));
  setBatchStatus(selected.length ? `已选择 ${selected.length} 个，点击“选择加入组”写入当前组` : '');
}

function syncBatchSelectionFromInput() {
  selectedBatchOrders = new Set(selectedBatchOrders);
}

function renderBatchProjectList() {
  if (!batchProjectList) return;
  syncBatchSelectionFromInput();
  batchProjectList.innerHTML = '';
  const sorted = [...prompts].sort(comparePromptOrder);
  for (const prompt of sorted) {
    const order = getOrder(prompt);
    const label = document.createElement('label');
    label.className = 'batch-project-item';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = order;
    checkbox.checked = selectedBatchOrders.has(order);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedBatchOrders.add(order);
      } else {
        selectedBatchOrders.delete(order);
      }
      syncBatchInputFromSelection();
    });
    const text = document.createElement('span');
    text.textContent = `${order} ${prompt.name || ''}`;
    label.append(checkbox, text);
    batchProjectList.appendChild(label);
  }
}

async function runBatchTrae(action) {
  const groupName = currentBatchGroupName();
  const orders = normalizeBatchOrders(parseBatchOrders());
  if (!orders.length) {
    setBatchStatus('当前组没有项目，请先选择项目并加入组', true);
    batchTraeInput?.focus();
    return;
  }
  const button = action === 'open' ? batchOpenTraeButton : batchCloseTraeButton;
  const otherButton = action === 'open' ? batchCloseTraeButton : batchOpenTraeButton;
  if (button) button.disabled = true;
  if (otherButton) otherButton.disabled = true;
  setBatchStatus(action === 'open' ? `开启组 ${groupName || '-'}：${orders.join(',')}` : `关闭组 ${groupName || '-'}：${orders.join(',')}`);
  try {
    const response = await fetch('/api/batch-trae-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, orders }),
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '批量操作失败');
    const results = Array.isArray(payload.results) ? payload.results : [];
    const okCount = results.filter((item) => item && item.ok).length;
    const failed = results.filter((item) => item && !item.ok);
    const failedText = failed.length ? `；失败 ${failed.length}：${failed.map((item) => item.order).join(',')}` : '';
    setBatchStatus(`完成 ${okCount}/${results.length || orders.length}${failedText}`, Boolean(failed.length));
  } catch (error) {
    setBatchStatus(`失败：${error.message || error}`, true);
  } finally {
    if (button) button.disabled = false;
    if (otherButton) otherButton.disabled = false;
  }
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyText(text, button) {
  await navigator.clipboard.writeText(text);
  const original = button.textContent;
  button.textContent = '已复制';
  button.classList.add('copied');
  setTimeout(() => {
    button.textContent = original;
    button.classList.remove('copied');
  }, 1000);
}

function splitPrompt(prompt) {
  const parts = String(prompt || '').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return { background: prompt || '', features: '', delivery: '' };
  if (parts.length === 2) return { background: parts[0], features: parts[1], delivery: '' };
  return { background: parts[0], features: parts.slice(1, -1).join('\n\n'), delivery: parts[parts.length - 1] };
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function fillSelect(select, values, label, formatValue = (value) => value) {
  select.innerHTML = '';
  const all = document.createElement('option');
  all.value = '';
  all.textContent = `全部${label}`;
  select.appendChild(all);
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = formatValue(value);
    select.appendChild(option);
  }
}

function renderStats() {
  const candidateCount = new Set(prompts.map((prompt) => prompt.candidate_id)).size;
  const completedCount = Object.keys(promptState.completed || {}).length;
  const cards = [
    ['素材', atoms.length],
    ['方案', candidateCount],
    ['Prompt', prompts.length],
    ['完成', completedCount],
    ['当前筛选', filteredPrompts.length],
  ];
  statsBar.innerHTML = cards.map(([label, value]) => `<article class="${label === '完成' ? 'done-stat' : ''}"><b>${value}</b><span>${label}</span></article>`).join('');
}

function matchesSearch(prompt, keyword) {
  if (!keyword) return true;
  const haystack = [
    prompt.name,
    prompt.target_user,
    prompt.product_form,
    prompt.scenario,
    prompt.business_domain,
    prompt.monetization,
    prompt.prompt_persona,
    prompt.prompt_subtone,
    prompt.prompt_intent,
    prompt.prompt_detail,
    ...(prompt.capability_bundle || []),
  ].join(' ').toLowerCase();
  return haystack.includes(keyword.toLowerCase());
}

function applyFilters() {
  const domain = domainFilter.value;
  const user = userFilter.value;
  const platform = platformFilter.value;
  const scenario = scenarioFilter.value;
  const keyword = searchInput.value.trim();

  filteredPrompts = prompts.filter((prompt) => {
    if (domain && prompt.business_domain !== domain) return false;
    if (user && prompt.target_user !== user) return false;
    if (platform && prompt.product_form !== platform) return false;
    if (scenario && prompt.scenario !== scenario) return false;
    return matchesSearch(prompt, keyword);
  }).sort(comparePromptOrder);

  renderStats();
  renderSceneButtons();
  renderRows();
  sessionOrderList = filteredPrompts.map((prompt) => getOrder(prompt));
  if (activeSessionOrder && !sessionOrderList.includes(activeSessionOrder)) {
    activeSessionOrder = '';
  }
  if (filteredPrompts.length && !filteredPrompts.some((prompt) => prompt.id === selectedPromptId)) {
    selectPrompt(filteredPrompts[0].id);
  } else if (!filteredPrompts.length) {
    selectedPromptId = '';
    detailPanel.hidden = true;
  }
}

function actionButton(label, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
}

function fetchWithTimeout(url, options = {}, timeoutMs = sessionFetchTimeoutMs) {
  if (!timeoutMs || timeoutMs < 0) {
    return fetch(url, options);
  }
  const controller = options.signal ? null : new AbortController();
  const timeout = window.setTimeout(() => {
    if (controller) controller.abort();
  }, timeoutMs);
  const requestOptions = controller ? { ...options, signal: controller.signal } : options;
  return fetch(url, requestOptions).finally(() => window.clearTimeout(timeout));
}

function isCompositeTraeSessionId(value) {
  return /^\.[^:\s]+:[0-9a-f]{32}_[0-9a-f]{24}\.[0-9a-f]{24}\.[0-9a-f]{24}:Trae CN\.T\(/.test(String(value || '').trim());
}

function rawSessionIdFromComposite(value) {
  const match = String(value || '').trim().match(/^\.[^:\s]+:[0-9a-f]{32}_([0-9a-f]{24})\.[0-9a-f]{24}\.[0-9a-f]{24}:Trae CN\.T\(/);
  return match ? match[1] : '';
}

function normalizeSessionRow(row) {
  const normalized = { ...(row || {}) };
  const sessionId = String(normalized.sessionId || '').trim();
  let rawSessionId = String(normalized.rawSessionId || '').trim();
  const logTrace = String(normalized.logTrace || '').trim();
  const logTraceId = String(normalized.logTraceId || '').trim();
  const sessionComposite = String(normalized.sessionComposite || '').trim();
  let composite = '';
  if (isCompositeTraeSessionId(sessionId)) {
    composite = sessionId;
  } else if (isCompositeTraeSessionId(logTraceId)) {
    composite = logTraceId;
  } else if (isCompositeTraeSessionId(sessionComposite)) {
    composite = sessionComposite;
  } else if (isCompositeTraeSessionId(logTrace)) {
    composite = logTrace;
  }
  if (composite) {
    normalized.logTraceId = normalized.logTraceId || composite;
    normalized.sessionComposite = normalized.sessionComposite || composite;
    if (isCompositeTraeSessionId(logTrace)) {
      normalized.logTrace = '';
    }
    rawSessionId = rawSessionId || rawSessionIdFromComposite(composite);
  }
  if (rawSessionId) {
    normalized.rawSessionId = rawSessionId;
  }
  if (!composite && rawSessionId && !sessionId) {
    normalized.sessionId = rawSessionId;
  }
  const existingDisplayId = String(normalized.sessionDisplayId || '').trim();
  const displaySessionId = isCompositeTraeSessionId(sessionId)
    ? rawSessionId
    : (sessionId || rawSessionId);
  normalized.sessionDisplayId = existingDisplayId || String(displaySessionId || '').trim();
  normalized.dissatisfactionReason = String(normalized.dissatisfactionReason || '').trim();
  return normalized;
}

function sessionLogTraceText(row) {
  const logTrace = String(row?.logTrace || '').trim();
  if (!logTrace || isCompositeTraeSessionId(logTrace)) return '未找到真实日志轨迹文件/内容';
  if (logTrace.startsWith('[reconstructed: true]') || logTrace.startsWith('[reconstructed: unavailable]')) {
    return '未找到真实日志轨迹文件/内容';
  }
  if (logTrace.includes('source: local-trae-logs') || logTrace.includes('Core Timeline:')) {
    return '未找到真实日志轨迹文件/内容';
  }
  if (logTrace && !isCompositeTraeSessionId(logTrace)) return logTrace;
  return '未找到真实日志轨迹文件/内容';
}

function makeSessionCopyCell(value, className, shorten = false) {
  const td = document.createElement('td');
  td.className = className;
  const text = String(value || '-');
  const show = shorten && text.length > 90 ? `${text.slice(0, 90)}...` : text;
  const textEl = document.createElement('span');
  textEl.className = 'session-cell-text';
  textEl.textContent = show;
  textEl.title = text;
  const copyBtn = actionButton('复制', 'session-copy-button');
  copyBtn.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copyText(text, copyBtn);
  });
  td.append(textEl, copyBtn);
  return td;
}

function renderSessionRows(payload) {
  if (!sessionRows || !sessionMeta) return;
  sessionRows.innerHTML = '';
  if (payload?.loading) {
    currentSessionRows = [];
    sessionMeta.textContent = `序号: ${payload?.order || '-'} | 读取本地缓存中...`;
    const tr = document.createElement('tr');
    tr.append(
      cell('-', 'session-id-cell'),
      cell('读取中，请稍候', 'session-conv-cell'),
      cell('-', 'session-reason-cell'),
      cell('-', 'session-log-cell'),
    );
    sessionRows.appendChild(tr);
    return;
  }
  const rows = Array.isArray(payload?.rows) ? payload.rows.map(normalizeSessionRow) : [];
  currentSessionRows = rows;
  const cacheText = payload?.cached
    ? ` | 已缓存${payload?.refreshedAt ? `: ${payload.refreshedAt}` : ''}${payload?.traceTimedOut ? ' | 日志仍在拉取' : ''}`
    : ' | 未刷新';
  sessionMeta.textContent = `序号: ${payload?.order || '-'} | 轮次: ${rows.length} | 当前会话: ${payload?.sessionId || '-'}${cacheText}`;
  if (!rows.length) {
    const tr = document.createElement('tr');
    const emptyText = payload?.justRefreshed
      ? '精准刷新完成，但没有匹配到真实 create message；未写 miss 或假 sessionId'
      : (payload?.cached ? '暂无会话输入记录' : '暂无本地缓存，请先点击该项目操作列的刷新按钮');
    tr.append(cell('-', ''), cell(emptyText, ''), cell('-', ''), cell('-', ''));
    sessionRows.appendChild(tr);
    return;
  }
  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.append(
      makeSessionCopyCell(row.sessionId || '-', 'session-id-cell'),
      makeSessionCopyCell(row.conversation || '', 'session-conv-cell', true),
      makeSessionCopyCell(row.dissatisfactionReason || '-', 'session-reason-cell', true),
      makeSessionCopyCell(sessionLogTraceText(row), 'session-log-cell', true),
    );
    sessionRows.appendChild(tr);
  }
}

function renderBatchSessionRows(payload) {
  if (!batchSessionRows || !batchSessionMeta) return;
  batchSessionRows.innerHTML = '';
  const rows = Array.isArray(payload?.rows) ? payload.rows.map(normalizeSessionRow) : [];
  currentBatchSessionRows = rows;
  const groupName = payload?.groupName || currentBatchGroupName() || '-';
  batchSessionMeta.textContent = `组: ${groupName} | 项目: ${payload?.orders?.length || 0} | 记录: ${rows.length}`;
  if (!rows.length) {
    const tr = document.createElement('tr');
    tr.append(
      cell('-', 'session-order-cell'),
      cell('-', 'session-id-cell'),
      cell('暂无批量会话数据', 'session-conv-cell'),
      cell('-', 'session-reason-cell'),
      cell('-', 'session-log-cell'),
    );
    batchSessionRows.appendChild(tr);
    return;
  }
  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.append(
      makeSessionCopyCell(row.order || '-', 'session-order-cell'),
      makeSessionCopyCell(row.sessionId || '-', 'session-id-cell'),
      makeSessionCopyCell(row.conversation || '', 'session-conv-cell', true),
      makeSessionCopyCell(row.dissatisfactionReason || '-', 'session-reason-cell', true),
      makeSessionCopyCell(sessionLogTraceText(row), 'session-log-cell', true),
    );
    batchSessionRows.appendChild(tr);
  }
}

function updateSessionNavState() {
  if (!sessionPrevButton || !sessionNextButton) return;
  const index = sessionOrderList.indexOf(activeSessionOrder);
  sessionPrevButton.disabled = index <= 0;
  sessionNextButton.disabled = index < 0 || index >= sessionOrderList.length - 1;
}

async function copySessionColumn(field, button) {
  if (field === 'logTrace') {
    const values = currentSessionRows
      .map((row) => String(row?.logTrace || '').trim())
      .filter((value) => value && !isCompositeTraeSessionId(value) && !value.startsWith('[reconstructed:') && !value.includes('source: local-trae-logs'));
    await copyText(values.length ? values.join('\n\n---\n\n') : '未找到真实日志轨迹文件/内容', button);
    return;
  }
  const values = currentSessionRows.map((row) => String(row?.[field] || '').trim());
  await copyText(values.map((value) => value.replace(/\r?\n/g, ' ')).join('\n'), button);
}

async function copyBatchColumn(field, button) {
  if (field === 'logTrace') {
    const values = currentBatchSessionRows
      .map((row) => String(row?.logTrace || '').trim())
      .filter((value) => value && !isCompositeTraeSessionId(value) && !value.startsWith('[reconstructed:') && !value.includes('source: local-trae-logs'));
    await copyText(values.length ? values.join('\n\n---\n\n') : '未找到真实日志轨迹文件/内容', button);
    return;
  }
  const values = currentBatchSessionRows.map((row) => String(row?.[field] || '').trim());
  await copyText(values.map((value) => value.replace(/\r?\n/g, ' ')).join('\n'), button);
}

async function showSessionModal(order) {
  if (!sessionModal) return;
  const targetOrder = String(order || '').trim();
  const requestId = ++sessionLoadRequestId;
  if (activeSessionFetchController) activeSessionFetchController.abort();
  const controller = new AbortController();
  activeSessionFetchController = controller;
  activeSessionOrder = targetOrder;
  updateSessionNavState();
  renderSessionRows({ order: targetOrder, loading: true });
  if (!sessionModal.open) sessionModal.showModal();
  const timeout = window.setTimeout(() => controller.abort(), sessionFetchTimeoutMs);
  try {
    const response = await fetch(`/api/trae-session-rounds?order=${encodeURIComponent(targetOrder)}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '读取失败');
    if (requestId !== sessionLoadRequestId || activeSessionOrder !== targetOrder) return;
    renderSessionRows(payload);
    updateSessionNavState();
  } catch (error) {
    if (error?.name === 'AbortError' && requestId !== sessionLoadRequestId) return;
    if (requestId !== sessionLoadRequestId || activeSessionOrder !== targetOrder) return;
    renderSessionRows({
      order: targetOrder,
      rows: [{
        sessionId: '-',
        rawSessionId: '',
        dissatisfactionReason: '-',
        conversation: error?.name === 'AbortError' ? '读取超时或已切换序号，请重试' : `读取失败: ${error.message || error}`,
        logTrace: '-',
      }],
      sessionId: '-',
    });
    updateSessionNavState();
  } finally {
    window.clearTimeout(timeout);
    if (activeSessionFetchController === controller) activeSessionFetchController = null;
  }
}

async function openSessionByOrder(order) {
  await showSessionModal(order);
}

function collectBatchOrders() {
  const groupName = currentBatchGroupName();
  const explicitOrders = normalizeBatchOrders(parseBatchOrders());
  if (explicitOrders.length) return { groupName, orders: explicitOrders };
  const groupOrders = normalizeBatchOrders(batchGroups[groupName] || []);
  return { groupName, orders: groupOrders };
}

async function openBatchSessions() {
  if (!batchSessionModal) return;
  const { groupName, orders } = collectBatchOrders();
  if (!orders.length) {
    setBatchStatus('当前组没有项目', true);
    return;
  }
  renderBatchSessionRows({ groupName, orders, rows: [] });
  if (!batchSessionModal.open) batchSessionModal.showModal();
  setBatchStatus(`批量会话加载中：${orders.join(',')}`);
  try {
    const results = [];
    for (const order of orders) {
      const response = await fetchWithTimeout(`/api/trae-session-rounds?order=${encodeURIComponent(order)}`, { cache: 'no-store' });
      const payload = await response.json();
      if (payload.ok) {
        for (const row of Array.isArray(payload.rows) ? payload.rows : []) {
          results.push({
            order,
            sessionId: row.sessionId || payload.sessionId || '-',
            rawSessionId: row.rawSessionId || '',
            logTraceId: row.logTraceId || '',
            sessionComposite: row.sessionComposite || '',
            dissatisfactionReason: row.dissatisfactionReason || '-',
            conversation: row.conversation || '',
            logTrace: row.logTrace || '',
          });
        }
      } else {
        results.push({
          order,
          sessionId: '-',
          rawSessionId: '',
          dissatisfactionReason: '-',
          conversation: `读取失败: ${payload.error || 'unknown'}`,
          logTrace: '',
        });
      }
      renderBatchSessionRows({ groupName, orders, rows: results });
    }
    renderBatchSessionRows({ groupName, orders, rows: results });
    setBatchStatus(`批量会话已加载：${results.length} 条`);
  } catch (error) {
    renderBatchSessionRows({
      groupName,
      orders,
      rows: [{
        order: '-',
        sessionId: '-',
        rawSessionId: '',
        dissatisfactionReason: '-',
        conversation: `读取失败: ${error.message || error}`,
        logTrace: '',
      }],
    });
    setBatchStatus(`批量会话读取失败：${error.message || error}`, true);
  }
}

async function moveSessionOrder(step) {
  const index = sessionOrderList.indexOf(activeSessionOrder);
  const nextOrder = sessionOrderList[index + step];
  if (!nextOrder) return;
  renderSessionRows({ order: nextOrder, loading: true });
  activeSessionOrder = nextOrder;
  updateSessionNavState();
  await openSessionByOrder(nextOrder);
}

function sessionRefreshButtonsForOrder(order) {
  const targetOrder = String(order || '').trim();
  return Array.from(document.querySelectorAll('[data-session-refresh-order]'))
    .filter((button) => button.dataset.sessionRefreshOrder === targetOrder);
}

function applySessionRefreshButtonState(button, state) {
  if (!button) return;
  button.classList.remove('session-refresh-loading', 'session-refresh-success', 'session-refresh-error', 'session-refresh-empty');
  if (state === 'loading') {
    button.disabled = true;
    button.textContent = '…';
    button.classList.add('session-refresh-loading');
  } else if (state === 'success') {
    button.disabled = true;
    button.textContent = '✓';
    button.classList.add('session-refresh-success');
  } else if (state === 'error') {
    button.disabled = true;
    button.textContent = '!';
    button.classList.add('session-refresh-error');
  } else if (state === 'empty') {
    button.disabled = false;
    button.textContent = '↻';
    button.classList.add('session-refresh-empty');
  } else {
    button.disabled = false;
    button.textContent = '↻';
  }
}

function setSessionRefreshButtonState(order, state) {
  const buttons = sessionRefreshButtonsForOrder(order);
  for (const button of buttons) {
    applySessionRefreshButtonState(button, state);
  }
}

function clearSessionRefreshPoll(order) {
  const targetOrder = String(order || '').trim();
  const timer = sessionRefreshPollTimers.get(targetOrder);
  if (timer) {
    window.clearTimeout(timer);
    sessionRefreshPollTimers.delete(targetOrder);
  }
}

function scheduleSessionRefreshPoll(order) {
  const targetOrder = String(order || '').trim();
  if (!targetOrder || !refreshingSessionOrders.has(targetOrder)) return;
  clearSessionRefreshPoll(targetOrder);
  const timer = window.setTimeout(() => {
    refreshSessionCache(targetOrder, null, { poll: true });
  }, 2500);
  sessionRefreshPollTimers.set(targetOrder, timer);
}

async function refreshSessionCache(order, button, options = {}) {
  const targetOrder = String(order || '').trim();
  if (!targetOrder) return;
  const isPoll = Boolean(options.poll);
  if (!isPoll) refreshingSessionOrders.add(targetOrder);
  setSessionRefreshButtonState(targetOrder, 'loading');
  setBatchStatus(isPoll ? `继续拉取会话缓存：${targetOrder}` : `刷新会话缓存：${targetOrder}`);
  const isTargetSessionOpen = () => sessionModal?.open && activeSessionOrder === targetOrder;
  if (isTargetSessionOpen() && !isPoll) {
    renderSessionRows({ order: targetOrder, loading: true });
  }
  try {
    const response = await fetchWithTimeout('/api/refresh-trae-session-rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: targetOrder, force: !isPoll }),
    }, 0);
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.busy ? '刷新繁忙，请稍后再点' : (payload.error || '刷新失败'));
    const queuedText = payload.queued ? '，复用队列任务' : '';
    if (payload.refreshPending) {
      if (isTargetSessionOpen() && payload.order === targetOrder && Array.isArray(payload.rows) && payload.rows.length > 0) {
        renderSessionRows(payload);
      }
      setBatchStatus(`正在后台拉取：${targetOrder}${queuedText}`);
      scheduleSessionRefreshPoll(targetOrder);
      return;
    }
    if (isTargetSessionOpen() && payload.order === targetOrder) {
      renderSessionRows({ ...payload, justRefreshed: true });
      updateSessionNavState();
    }
    clearSessionRefreshPoll(targetOrder);
    let rowCount = Array.isArray(payload.rows) ? payload.rows.length : 0;
    if (payload.refreshNoNewRows) {
      setBatchStatus(`本次未拉到新会话：${targetOrder}，保留现有缓存`, true);
      setSessionRefreshButtonState(targetOrder, 'empty');
      setTimeout(() => {
        refreshingSessionOrders.delete(targetOrder);
        setSessionRefreshButtonState(targetOrder, 'idle');
      }, 1400);
      return;
    }
    if (payload.order === targetOrder && rowCount === 0) {
      try {
        const verifyResponse = await fetchWithTimeout(`/api/trae-session-rounds?order=${encodeURIComponent(targetOrder)}`, { cache: 'no-store' });
        const verifyPayload = await verifyResponse.json();
        if (verifyPayload.ok) {
          rowCount = Array.isArray(verifyPayload.rows) ? verifyPayload.rows.length : 0;
          if (isTargetSessionOpen()) {
            renderSessionRows({ ...verifyPayload, justRefreshed: true });
            updateSessionNavState();
          }
        }
      } catch (verifyError) {
        console.warn('刷新后复核会话缓存失败:', verifyError);
      }
    }
    setSessionRefreshButtonState(targetOrder, rowCount > 0 ? 'success' : 'empty');
    setBatchStatus(rowCount > 0 ? `刷新完成：${targetOrder}${queuedText}` : `刷新完成但无真实会话行：${targetOrder}${queuedText}`);
    setTimeout(() => {
      refreshingSessionOrders.delete(targetOrder);
      setSessionRefreshButtonState(targetOrder, 'idle');
    }, 900);
  } catch (error) {
    console.error('刷新会话缓存失败:', error);
    clearSessionRefreshPoll(targetOrder);
    setSessionRefreshButtonState(targetOrder, 'error');
    if (isTargetSessionOpen()) {
      renderSessionRows({
        order: targetOrder,
        rows: [{ sessionId: '-', conversation: `刷新失败: ${error.message || error}`, logTrace: '-' }],
        sessionId: '-',
      });
    }
    setTimeout(() => {
      refreshingSessionOrders.delete(targetOrder);
      setSessionRefreshButtonState(targetOrder, 'idle');
    }, 1400);
  }
}

async function setCompleted(promptId, completed) {
  const response = await fetch('/api/prompt-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt_id: promptId, completed }),
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error || '状态保存失败');
  promptState = payload.state || { completed: {} };
  renderStats();
  renderSceneButtons();
  renderRows();
}


async function savePromptOrder(row, order, input) {
  if (!Number.isInteger(order) || order <= 0) {
    input.classList.add('invalid-order');
    return false;
  }
  const nextToken = orderToken(row, order);
  const duplicate = prompts.find((item) => item.id !== row.id && orderToken(item, getOrder(item)) === nextToken);
  if (duplicate) {
    input.classList.add('invalid-order');
    return false;
  }
  const response = await fetch('/api/prompt-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt_id: row.id, order, order_token: nextToken }),
  });
  const payload = await response.json();
  if (!payload.ok) {
    input.classList.add('invalid-order');
    return false;
  }
  promptState = payload.state || promptState;
  renderStats();
  renderSceneButtons();
  renderBatchProjectList();
  renderRows();
  return true;
}

function beginOrderEdit(row, orderTd) {
  const current = getOrder(row);
  const currentNumber = orderNumber(current);
  orderTd.innerHTML = '';
  orderTd.classList.add('editing');
  const input = document.createElement('input');
  input.className = 'order-input';
  input.type = 'number';
  input.min = '1';
  input.step = '1';
  input.value = Number.isInteger(currentNumber) && currentNumber > 0 ? String(currentNumber) : String(row.global_order || 1);
  orderTd.appendChild(input);
  input.focus();
  input.select();

  let finished = false;
  const finish = async (save) => {
    if (finished) return;
    finished = true;
    if (!save) {
      renderRows();
      return;
    }
    const next = Number.parseInt(input.value, 10);
    const ok = await savePromptOrder(row, next, input);
    if (!ok) {
      finished = false;
      input.focus();
      input.select();
    }
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') finish(true);
    if (event.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

async function saveMapImage(row, file, statusEl) {
  if (!file || !file.type.startsWith('image/')) {
    statusEl.textContent = '仅支持图片';
    statusEl.classList.add('error');
    return;
  }
  statusEl.textContent = '保存中...';
  statusEl.classList.remove('error', 'saved');
  const dataUrl = await readFileAsDataUrl(file);
  const response = await fetch('/api/project-map-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scene: normalizeDomainName(row.business_domain),
      order: getOrder(row),
      filename: file.name || '',
      data_url: dataUrl,
    }),
  });
  const payload = await response.json();
  if (!payload.ok) {
    statusEl.textContent = payload.error || '保存失败';
    statusEl.classList.add('error');
    return;
  }
  statusEl.textContent = `已保存 ${payload.filename}`;
  statusEl.classList.add('saved');
}

function mapInputCell(row) {
  const td = document.createElement('td');
  td.className = 'map-cell';

  const wrapper = document.createElement('div');
  wrapper.className = 'map-input-wrapper';

  const dropBox = document.createElement('div');
  dropBox.className = 'map-input-box';
  dropBox.tabIndex = 0;
  dropBox.textContent = '粘贴/拖入/选择图片';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.className = 'map-file-input';

  const status = document.createElement('span');
  status.className = 'map-save-status';

  const saveFirstFile = async (files) => {
    const file = Array.from(files || []).find((item) => item && item.type.startsWith('image/'));
    if (!file) {
      status.textContent = '未检测到图片';
      status.classList.add('error');
      return;
    }
    try {
      await saveMapImage(row, file, status);
    } catch (error) {
      status.textContent = error.message || '保存失败';
      status.classList.add('error');
    }
  };

  dropBox.addEventListener('click', (event) => {
    event.stopPropagation();
    fileInput.click();
  });
  dropBox.addEventListener('paste', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await saveFirstFile(event.clipboardData?.files);
  });
  dropBox.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropBox.classList.add('dragging');
  });
  dropBox.addEventListener('dragleave', () => {
    dropBox.classList.remove('dragging');
  });
  dropBox.addEventListener('drop', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropBox.classList.remove('dragging');
    await saveFirstFile(event.dataTransfer?.files);
  });
  fileInput.addEventListener('click', (event) => event.stopPropagation());
  fileInput.addEventListener('change', async () => {
    await saveFirstFile(fileInput.files);
    fileInput.value = '';
  });

  wrapper.append(dropBox, fileInput, status);
  td.appendChild(wrapper);
  return td;
}

function renderRows() {
  rowsEl.innerHTML = '';
  for (const [index, row] of filteredPrompts.entries()) {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;
    if (row.id === selectedPromptId) tr.classList.add('selected-row');
    if (isCompleted(row.id)) tr.classList.add('completed-row');
    const orderTd = document.createElement('td');
    orderTd.className = 'number-cell order-cell';
    
    const orderWrapper = document.createElement('div');
    orderWrapper.className = 'order-wrapper';
    
    const orderSpan = document.createElement('span');
    orderSpan.className = 'order-text';
    orderSpan.textContent = getOrder(row);
    
    const orderButtons = document.createElement('div');
    orderButtons.className = 'order-buttons';
    
    const copyOrder = actionButton('⧉', 'order-copy-button');
    copyOrder.addEventListener('click', async (event) => {
      event.stopPropagation();
      await copyText(getOrder(row), copyOrder);
    });
    const editOrder = actionButton('✎', 'order-button');
    editOrder.addEventListener('click', async (event) => {
      event.stopPropagation();
      beginOrderEdit(row, orderTd);
    });
    
    orderButtons.append(copyOrder, editOrder);
    orderWrapper.append(orderSpan, orderButtons);
    orderTd.appendChild(orderWrapper);

    tr.append(
      cell(row.name, 'name-cell'),
      orderTd,
      mapInputCell(row)
    );

    const actionTd = document.createElement('td');
    actionTd.className = 'action-cell';

    const doneButton = actionButton(isCompleted(row.id) ? '🔒' : '🔓', 'done-button');
    doneButton.title = '标记完成/未完成';
    doneButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      await setCompleted(row.id, !isCompleted(row.id));
    });

    const copyButton = actionButton('⧉', 'mini-button');
    copyButton.title = '复制 Prompt';
    copyButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      await copyText(row.prompt, copyButton);
    });

    const openButton = actionButton('🏷️', 'mini-button');
    openButton.title = '在 Trae 中打开项目目录';
    openButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      const scene = normalizeDomainName(row.business_domain);
      const order = getOrder(row);
      openButton.disabled = true;
      const previousText = openButton.textContent;
      openButton.textContent = '…';
      setBatchStatus(`正在开启 Trae：${order}`);
      try {
        const response = await fetch('/api/open-project-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scene, order }),
        });
        const payload = await response.json();
        if (!payload.ok) {
          throw new Error(payload.error || '打开项目目录失败');
        }
        setBatchStatus(`已发送 Trae 开启命令：${order}`);
      } catch (error) {
        console.error('打开项目目录失败:', error);
        setBatchStatus(`开启 Trae 失败：${order}，${error.message || error}`, true);
      } finally {
        openButton.disabled = false;
        openButton.textContent = previousText;
      }
    });

    const mapsButton = actionButton('🖼', 'mini-button');
    mapsButton.title = '打开 maps 目录';
    mapsButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      const scene = normalizeDomainName(row.business_domain);
      const order = getOrder(row);
      try {
        const response = await fetch('/api/open-project-maps-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scene, order }),
        });
        const payload = await response.json();
        if (!payload.ok) {
          console.error('打开 maps 目录失败:', payload.error);
        }
      } catch (error) {
        console.error('打开 maps 目录失败:', error);
      }
    });

    const sessionButton = actionButton('📄', 'mini-button');
    sessionButton.title = '查看会话缓存';
    sessionButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      await openSessionByOrder(getOrder(row));
    });

    const refreshSessionButton = actionButton('↻', 'mini-button session-refresh-button');
    const refreshOrder = getOrder(row);
    refreshSessionButton.dataset.sessionRefreshOrder = refreshOrder;
    refreshSessionButton.title = '刷新会话缓存';
    applySessionRefreshButtonState(refreshSessionButton, refreshingSessionOrders.has(refreshOrder) ? 'loading' : 'idle');
    refreshSessionButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await refreshSessionCache(refreshOrder, refreshSessionButton);
    });

    actionTd.append(doneButton, copyButton, openButton, mapsButton, refreshSessionButton, sessionButton);
    tr.appendChild(actionTd);

    tr.addEventListener('click', () => selectPrompt(row.id));
    rowsEl.appendChild(tr);
  }
}

function selectPrompt(promptId) {
  selectedPromptId = promptId;
  const prompt = prompts.find((item) => item.id === promptId);
  selectedParts = splitPrompt(prompt?.prompt || '未找到 Prompt，请先重新生成方案数据。');
  detailPanel.hidden = false;
  promptBackground.textContent = selectedParts.background;
  promptFeatures.textContent = selectedParts.features;
  promptDelivery.textContent = selectedParts.delivery;
  renderRows();
}

async function loadJson(path, fallback) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) return fallback;
  return response.json();
}

async function loadPromptState() {
  try {
    const response = await fetch('/api/prompt-state', { cache: 'no-store' });
    const payload = await response.json();
    promptState = payload.state || { completed: {} };
  } catch {
    promptState = { completed: {} };
  }
}

async function loadWorkbenchConfig() {
  try {
    const response = await fetch('/api/workbench-config', { cache: 'no-store' });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '读取配置失败');
    if (githubRepoUrlInput) githubRepoUrlInput.value = String(payload.default_github_repo_url || '').trim();
    if (feishuTaskUrlInput) feishuTaskUrlInput.value = String(payload.default_feishu_task_url || '').trim();
  } catch (error) {
    if (githubRepoUrlInput && !githubRepoUrlInput.value) githubRepoUrlInput.placeholder = `配置读取失败：${error.message}`;
    if (feishuTaskUrlInput && !feishuTaskUrlInput.value) feishuTaskUrlInput.placeholder = `配置读取失败：${error.message}`;
  }
}

function bindBatchTraeControls() {
  if (batchTraeInput) {
    batchTraeInput.addEventListener('input', () => {
      if (activeBatchGroup && batchGroups[activeBatchGroup]) {
        batchGroups[activeBatchGroup] = normalizeBatchOrders(parseBatchOrders());
      }
    });
  }
  if (batchGroupSelect) {
    batchGroupSelect.addEventListener('change', () => loadBatchGroup(batchGroupSelect.value));
  }
  if (addToBatchGroupButton) {
    addToBatchGroupButton.addEventListener('click', async () => {
      try {
        await addSelectionToActiveGroup();
      } catch (error) {
        setBatchStatus(`加入组失败：${error.message || error}`, true);
      }
    });
  }
  if (saveBatchGroupButton) {
    saveBatchGroupButton.addEventListener('click', async () => {
      try {
        await saveBatchGroup(currentBatchGroupName(), parseBatchOrders());
      } catch (error) {
        setBatchStatus(`保存组失败：${error.message || error}`, true);
      }
    });
  }
  if (deleteBatchGroupButton) {
    deleteBatchGroupButton.addEventListener('click', async () => {
      try {
        await deleteActiveBatchGroup();
      } catch (error) {
        setBatchStatus(`删除组失败：${error.message || error}`, true);
      }
    });
  }
  if (batchOpenTraeButton) {
    batchOpenTraeButton.addEventListener('click', () => runBatchTrae('open'));
  }
if (batchCloseTraeButton) {
  batchCloseTraeButton.addEventListener('click', () => runBatchTrae('close'));
}

if (openBatchSessionsButton) {
  openBatchSessionsButton.addEventListener('click', async () => {
    await openBatchSessions();
  });
}
}


function renderSceneButtons() {
  const domains = uniqueSorted(prompts.map((prompt) => prompt.business_domain));
  sceneButtons.innerHTML = '';
  for (const domain of domains) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'scene-button';
    button.textContent = displayDomainName(domain);
    if (domainFilter.value === domain) button.classList.add('active');
    button.addEventListener('click', () => {
      domainFilter.value = domain;
      applyFilters();
      renderSceneButtons();
    });
    sceneButtons.appendChild(button);
  }
}

function bindFilters() {
  fillSelect(domainFilter, uniqueSorted(prompts.map((prompt) => prompt.business_domain)), '业务', displayDomainName);
  fillSelect(userFilter, uniqueSorted(prompts.map((prompt) => prompt.target_user)), '用户');
  fillSelect(platformFilter, uniqueSorted(prompts.map((prompt) => prompt.product_form)), '平台');
  fillSelect(scenarioFilter, uniqueSorted(prompts.map((prompt) => prompt.scenario)), '场景');
  for (const control of [domainFilter, userFilter, platformFilter, scenarioFilter, searchInput]) {
    control.addEventListener('input', applyFilters);
    control.addEventListener('change', applyFilters);
  }
}

function setSyncStatus(text, isError = false) {
  if (!syncGithubStatus) return;
  syncGithubStatus.textContent = text || '';
  syncGithubStatus.classList.toggle('error', Boolean(isError));
}

function setClaimStatus(text, isError = false) {
  if (!claimFeishuStatus) return;
  claimFeishuStatus.textContent = text || '';
  claimFeishuStatus.classList.toggle('error', Boolean(isError));
}

async function claimFeishuTasks() {
  if (!claimFeishuTasksButton || !feishuClaimCountInput || !feishuTaskUrlInput) return;
  const count = Number.parseInt(feishuClaimCountInput.value, 10);
  const taskUrl = String(feishuTaskUrlInput.value || '').trim();
  if (!Number.isInteger(count) || count <= 0) {
    setClaimStatus('请输入大于 0 的数量', true);
    feishuClaimCountInput.focus();
    return;
  }
  if (!taskUrl) {
    setClaimStatus('请输入飞书地址', true);
    feishuTaskUrlInput.focus();
    return;
  }

  claimFeishuTasksButton.disabled = true;
  setClaimStatus(`开始领取 ${count} 道题...`);
  try {
    const response = await fetch('/api/claim-feishu-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, task_url: taskUrl }),
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '领取失败');
    setClaimStatus(`完成：计划 ${payload.requested}，点击领取 ${payload.claimed}，翻页 ${payload.page_turns || 0}`);
  } catch (error) {
    setClaimStatus(`失败：${error.message}`, true);
  } finally {
    claimFeishuTasksButton.disabled = false;
  }
}

async function syncCompletedToGithub() {
  if (!syncGithubAllButton || !githubRepoUrlInput) return;
  const repoUrl = String(githubRepoUrlInput.value || '').trim();
  if (!repoUrl) {
    setSyncStatus('请输入 GitHub 地址', true);
    githubRepoUrlInput.focus();
    return;
  }
  syncGithubAllButton.disabled = true;
  setSyncStatus('同步中...');
  try {
    const response = await fetch('/api/sync-github-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: repoUrl }),
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '同步失败');
    const synced = Number(payload.synced || 0);
    const skipped = Number(payload.skipped || 0);
    const failed = Number(payload.failed || 0);
    const firstFailed = (payload.results || []).find((item) => item && item.status === 'failed');
    const failureText = firstFailed ? `；首个失败：${firstFailed.order || firstFailed.prompt_id} ${firstFailed.reason || ''}` : '';
    setSyncStatus(`完成：同步 ${synced}，跳过 ${skipped}，失败 ${failed}${failureText}`);
  } catch (error) {
    setSyncStatus(`失败：${error.message}`, true);
  } finally {
    syncGithubAllButton.disabled = false;
  }
}

async function loadPromptFactory() {
  await loadWorkbenchConfig();
  candidates = await loadJson('./data/generated/zero_to_one_candidates.json', []);
  prompts = await loadJson('./data/generated/generation_prompts.json', []);
  atoms = await loadJson('./data/normalized/product_atoms.json', []);
  prompts = prompts.map((prompt) => ({
    ...prompt,
    business_domain: normalizeDomainName(prompt.business_domain),
  }));
  candidates = candidates.map((candidate) => ({
    ...candidate,
    business_domain: normalizeDomainName(candidate.business_domain),
  }));
  atoms = atoms.map((atom) => ({
    ...atom,
    business_domain: normalizeDomainName(atom.business_domain),
  }));
  await loadPromptState();
  await fetchBatchGroups();
  bindFilters();
  bindBatchTraeControls();
  if ([...domainFilter.options].some((option) => option.value === 'shopping')) domainFilter.value = 'shopping';
  renderSceneButtons();
  renderBatchProjectList();
  applyFilters();
}


document.querySelectorAll('.part-copy').forEach((button) => {
  button.addEventListener('click', async () => {
    const part = button.dataset.part;
    await copyText(selectedParts[part] || '', button);
  });
});

function initDraggableDetailPanel() {
  if (!detailPanel) return;

  let dragState = null;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  detailPanel.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    const rect = detailPanel.getBoundingClientRect();
    dragState = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    detailPanel.classList.add('dragging');
    detailPanel.setPointerCapture(event.pointerId);
  });

  detailPanel.addEventListener('pointermove', (event) => {
    if (!dragState) return;
    const rect = detailPanel.getBoundingClientRect();
    const left = clamp(event.clientX - dragState.offsetX, 0, window.innerWidth - rect.width);
    const top = clamp(event.clientY - dragState.offsetY, 0, window.innerHeight - rect.height);
    detailPanel.style.left = `${left}px`;
    detailPanel.style.top = `${top}px`;
    detailPanel.style.right = 'auto';
    detailPanel.style.bottom = 'auto';
    detailPanel.style.transform = 'none';
  });

  const stopDragging = (event) => {
    if (!dragState) return;
    dragState = null;
    detailPanel.classList.remove('dragging');
    if (detailPanel.hasPointerCapture(event.pointerId)) {
      detailPanel.releasePointerCapture(event.pointerId);
    }
  };

  detailPanel.addEventListener('pointerup', stopDragging);
  detailPanel.addEventListener('pointercancel', stopDragging);
}

initDraggableDetailPanel();

if (syncGithubAllButton) {
  syncGithubAllButton.addEventListener('click', syncCompletedToGithub);
}

if (claimFeishuTasksButton) {
  claimFeishuTasksButton.addEventListener('click', claimFeishuTasks);
}

if (sessionModal) {
  sessionModal.addEventListener('cancel', () => {
    if (activeSessionFetchController) activeSessionFetchController.abort();
    sessionModal.close();
  });
  sessionModal.addEventListener('click', (event) => {
    if (event.target === sessionModal) {
      if (activeSessionFetchController) activeSessionFetchController.abort();
      sessionModal.close();
    }
  });
}

if (sessionPrevButton) {
  sessionPrevButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await moveSessionOrder(-1);
  });
}

if (sessionNextButton) {
  sessionNextButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await moveSessionOrder(1);
  });
}

if (copySessionIdColumnButton) {
  copySessionIdColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copySessionColumn('sessionId', copySessionIdColumnButton);
  });
}

if (copyDissatisfactionColumnButton) {
  copyDissatisfactionColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copySessionColumn('dissatisfactionReason', copyDissatisfactionColumnButton);
  });
}

if (copyConversationColumnButton) {
  copyConversationColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copySessionColumn('conversation', copyConversationColumnButton);
  });
}

if (copyLogTraceColumnButton) {
  copyLogTraceColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copySessionColumn('logTrace', copyLogTraceColumnButton);
  });
}

if (batchSessionModal) {
  batchSessionModal.addEventListener('cancel', () => batchSessionModal.close());
  batchSessionModal.addEventListener('click', (event) => {
    if (event.target === batchSessionModal) batchSessionModal.close();
  });
}

if (copyBatchOrderColumnButton) {
  copyBatchOrderColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copyBatchColumn('order', copyBatchOrderColumnButton);
  });
}

if (copyBatchSessionIdColumnButton) {
  copyBatchSessionIdColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copyBatchColumn('sessionId', copyBatchSessionIdColumnButton);
  });
}

if (copyBatchDissatisfactionColumnButton) {
  copyBatchDissatisfactionColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copyBatchColumn('dissatisfactionReason', copyBatchDissatisfactionColumnButton);
  });
}

if (copyBatchConversationColumnButton) {
  copyBatchConversationColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copyBatchColumn('conversation', copyBatchConversationColumnButton);
  });
}

if (copyBatchLogTraceColumnButton) {
  copyBatchLogTraceColumnButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    await copyBatchColumn('logTrace', copyBatchLogTraceColumnButton);
  });
}

loadPromptFactory().catch((error) => {
  rowsEl.innerHTML = `<tr><td colspan="3">数据加载失败：${error.message}</td></tr>`;
});
