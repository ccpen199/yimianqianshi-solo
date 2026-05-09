const $ = (id) => document.getElementById(id);

const els = {
  apiBase: $('apiBase'),
  apiToken: $('apiToken'),
  btnLoadProviders: $('btnLoadProviders'),
  providerState: $('providerState'),
  repoPath: $('repoPath'),
  btnPickRepoPath: $('btnPickRepoPath'),
  repoName: $('repoName'),
  btnAddProject: $('btnAddProject'),
  projectResult: $('projectResult'),
  providerSelect: $('providerSelect'),
  modelInput: $('modelInput'),
  sandboxSelect: $('sandboxSelect'),
  promptInput: $('promptInput'),
  btnRunAdvisor: $('btnRunAdvisor'),
  btnAdvisorPrompt: $('btnAdvisorPrompt'),
  btnAsk: $('btnAsk'),
  askResult: $('askResult'),
  tabButtons: Array.from(document.querySelectorAll('.tab-btn')),
  tabPanels: Array.from(document.querySelectorAll('.tab-panel')),
  marketMeta: $('marketMeta'),
  marketCategories: $('marketCategories'),
  targetProject: $('targetProject'),
  marketSources: $('marketSources'),
};

let currentProjectId = '';
let currentConversationId = '';
let activeTaskId = '';
let streamSource = null;
let streamConnectSeq = 0;
let streamReconnectAttempts = 0;
let streamReconnectTimer = null;
let streamClosedByDone = false;
let streamState = null;
const REPO_PATH_STORAGE_KEY = 'codexLocalRepoAgent.repoPath';

const MARKET_RESEARCH = {
  updatedAt: '2026-04-24',
  categories: [
    {
      name: '商业编码助手',
      summary: '成熟 SaaS，主打 IDE 内智能补全、解释、重构与团队协作。',
      products: ['GitHub Copilot', 'Cursor', 'JetBrains AI Assistant', 'Tabnine', 'Replit AI'],
    },
    {
      name: '开源编码 Agent（GitHub）',
      summary: '以仓库为上下文，强调可扩展、可审计和本地/私有化部署能力。',
      products: ['OpenAI Codex CLI', 'Cline', 'Continue', 'Aider', 'Roo Code'],
    },
    {
      name: 'Agent 框架与执行平台',
      summary: '强调多代理协作、任务执行链路和工具编排能力。',
      products: ['OpenHands', 'Microsoft AutoGen', 'LangGraph'],
    },
    {
      name: '自动化与工作流编排',
      summary: '更偏“业务流程自动化”，可与代码 Agent 互补集成。',
      products: ['n8n', 'Dify', 'Zapier', 'Make'],
    },
  ],
  targetProject: {
    requirementSource: 'codex-local-repo-agent/README.md',
    goal: '面向本地仓库的“提问建议 + 执行追踪 + 结果沉淀”一体化工作台。',
    primaryName: 'Repo Compass Agent Hub',
    alternatives: ['Codebase Navigator', 'Local Repo Copilot Desk', 'Prompt-to-Action Studio'],
    why: [
      '需求文档强调“本地仓库 + 提问建议 Agent + 可执行闭环”。',
      '现有页面具备 Provider、项目管理、任务流式追踪，适合作为 Agent 运维台继续扩展。',
      '命名聚焦“仓库导航 + Agent 执行中心”，便于对内对外统一表达。',
    ],
  },
  sources: [
    { title: 'OpenAI Codex (GitHub)', url: 'https://github.com/openai/codex' },
    { title: 'Continue (GitHub)', url: 'https://github.com/continue-revolution/continue' },
    { title: 'Cline (GitHub)', url: 'https://github.com/cline/cline' },
    { title: 'Aider (GitHub)', url: 'https://github.com/Aider-AI/aider' },
    { title: 'Roo Code (GitHub)', url: 'https://github.com/RooCodeInc/Roo-Code' },
    { title: 'OpenHands (GitHub)', url: 'https://github.com/All-Hands-AI/OpenHands' },
    { title: 'Microsoft AutoGen (GitHub)', url: 'https://github.com/microsoft/autogen' },
    { title: 'LangGraph Docs', url: 'https://langchain-ai.github.io/langgraph/' },
    { title: 'n8n (GitHub)', url: 'https://github.com/n8n-io/n8n' },
    { title: 'Dify (GitHub)', url: 'https://github.com/langgenius/dify' },
    { title: 'GitHub Copilot', url: 'https://github.com/features/copilot' },
    { title: 'Cursor', url: 'https://www.cursor.com/' },
    { title: 'JetBrains AI Assistant', url: 'https://www.jetbrains.com/ai/' },
    { title: 'Tabnine', url: 'https://www.tabnine.com/' },
    { title: 'Replit AI', url: 'https://replit.com/ai' },
    { title: 'Zapier', url: 'https://zapier.com/' },
    { title: 'Make', url: 'https://www.make.com/' },
  ],
};

function api(path) {
  const base = els.apiBase.value.trim().replace(/\/$/, '');
  return `${base}${path}`;
}

function authHeaders() {
  const token = els.apiToken.value.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function tokenValue() {
  return els.apiToken.value.trim();
}

function setLog(el, content) {
  el.textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function initTabs() {
  const showTab = (tabId) => {
    els.tabButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    els.tabPanels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });
  };

  els.tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });
}

function renderMarketResearch() {
  if (els.marketMeta) {
    const totalProducts = MARKET_RESEARCH.categories.reduce((sum, item) => sum + item.products.length, 0);
    els.marketMeta.textContent = `更新时间: ${MARKET_RESEARCH.updatedAt} | 分类: ${MARKET_RESEARCH.categories.length} | 代表产品: ${totalProducts}`;
  }

  if (els.marketCategories) {
    els.marketCategories.innerHTML = MARKET_RESEARCH.categories.map((item) => `
      <article class="category-card">
        <h3>${escapeHtml(item.name)}</h3>
        <p class="muted-note">${escapeHtml(item.summary)}</p>
        <div class="tag-list">
          ${item.products.map((name) => `<span class="tag">${escapeHtml(name)}</span>`).join('')}
        </div>
      </article>
    `).join('');
  }

  if (els.targetProject) {
    const target = MARKET_RESEARCH.targetProject;
    els.targetProject.innerHTML = `
      <h3>目标项目: ${escapeHtml(target.goal)}</h3>
      <p class="muted-note">需求依据: ${escapeHtml(target.requirementSource)}</p>
      <h4>主名称: ${escapeHtml(target.primaryName)}</h4>
      <div class="tag-list">
        ${target.alternatives.map((name) => `<span class="tag">${escapeHtml(name)}</span>`).join('')}
      </div>
      <div>
        ${target.why.map((line) => `<p class="muted-note">${escapeHtml(line)}</p>`).join('')}
      </div>
    `;
  }

  if (els.marketSources) {
    els.marketSources.innerHTML = MARKET_RESEARCH.sources.map((source, idx) => `
      <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">
        ${idx + 1}. ${escapeHtml(source.title)}
      </a>
    `).join('');
  }
}

function sseUrl(path) {
  const url = new URL(api(path));
  const token = tokenValue();
  if (token) {
    // SSE 无法自定义 Authorization header，服务端支持 token query 参数。
    url.searchParams.set('token', token);
  }
  return url.toString();
}

function safeParseJson(raw) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function setAskBusy(busy) {
  els.btnAsk.disabled = busy || !currentProjectId;
  els.btnRunAdvisor.disabled = busy || !currentProjectId;
}

function detectAutoRepoPath() {
  const queryPath = new URLSearchParams(window.location.search).get('repoPath');
  if (queryPath && queryPath.trim()) return queryPath.trim();

  const defaultPath = els.repoPath?.dataset?.defaultPath || '';
  if (defaultPath.trim()) return defaultPath.trim();

  const persistedPath = localStorage.getItem(REPO_PATH_STORAGE_KEY) || '';
  if (persistedPath.trim()) return persistedPath.trim();

  return els.repoPath?.defaultValue?.trim() || '';
}

function autofillRepoPath() {
  if (!els.repoPath) return '';
  if (els.repoPath.value.trim()) return els.repoPath.value.trim();
  const path = detectAutoRepoPath();
  if (path) {
    els.repoPath.value = path;
  }
  return path;
}

function flashButtonSuccess(btn, text = '已填入') {
  if (!btn) return;
  const prev = btn.textContent;
  btn.textContent = text;
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = prev;
    btn.disabled = false;
  }, 900);
}

async function jsonFetch(path, options = {}) {
  const resp = await fetch(api(path), {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await resp.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    data = { raw: text };
  }

  if (!resp.ok) {
    const err = data?.error || data?.raw || `HTTP ${resp.status}`;
    throw new Error(err);
  }

  return data;
}

function updateAskEnabled() {
  setAskBusy(false);
}

function resetStreamState(taskId) {
  streamState = {
    taskId,
    connection: 'connecting',
    status: 'queued',
    reconnectAttempts: 0,
    eventCount: 0,
    stdoutTail: [],
    stderrTail: [],
    finalMessage: '',
    error: '',
  };
}

function pushTail(lines, text, limit = 30) {
  const line = String(text || '').trimEnd();
  if (!line) return;
  lines.push(line);
  if (lines.length > limit) {
    lines.splice(0, lines.length - limit);
  }
}

function renderStreamState() {
  if (!streamState) return;
  setLog(els.askResult, {
    ok: streamState.status === 'completed',
    taskId: streamState.taskId,
    conversationId: currentConversationId,
    connection: streamState.connection,
    status: streamState.status,
    reconnectAttempts: streamState.reconnectAttempts,
    eventCount: streamState.eventCount,
    finalMessage: streamState.finalMessage || '(streaming...)',
    error: streamState.error || '',
    stdoutTail: streamState.stdoutTail,
    stderrTail: streamState.stderrTail,
  });
}

function stopTaskStream() {
  streamConnectSeq += 1;
  streamClosedByDone = true;
  if (streamReconnectTimer) {
    clearTimeout(streamReconnectTimer);
    streamReconnectTimer = null;
  }
  if (streamSource) {
    streamSource.close();
    streamSource = null;
  }
}

function attachTaskStream(taskId) {
  streamConnectSeq += 1;
  const connectSeq = streamConnectSeq;
  streamClosedByDone = false;
  if (streamReconnectTimer) {
    clearTimeout(streamReconnectTimer);
    streamReconnectTimer = null;
  }
  if (streamSource) {
    streamSource.close();
    streamSource = null;
  }

  const source = new EventSource(sseUrl(`/api/tasks/${encodeURIComponent(taskId)}/stream`));
  streamSource = source;
  streamState.connection = 'connecting';
  renderStreamState();

  source.addEventListener('open', () => {
    if (connectSeq !== streamConnectSeq || activeTaskId !== taskId) return;
    streamReconnectAttempts = 0;
    streamState.connection = 'open';
    streamState.reconnectAttempts = 0;
    renderStreamState();
  });

  source.addEventListener('snapshot', (evt) => {
    if (connectSeq !== streamConnectSeq || activeTaskId !== taskId) return;
    const snap = safeParseJson(evt.data);
    if (snap?.conversationId) {
      currentConversationId = String(snap.conversationId);
    }
    if (snap?.status) {
      streamState.status = String(snap.status);
    }
    if (snap?.finalMessage) {
      streamState.finalMessage = String(snap.finalMessage);
    }
    if (snap?.error) {
      streamState.error = String(snap.error);
    }
    renderStreamState();
  });

  source.addEventListener('stdout', (evt) => {
    if (connectSeq !== streamConnectSeq || activeTaskId !== taskId) return;
    const payload = safeParseJson(evt.data);
    pushTail(streamState.stdoutTail, payload?.line ?? payload?.text ?? '');
    renderStreamState();
  });

  source.addEventListener('stderr', (evt) => {
    if (connectSeq !== streamConnectSeq || activeTaskId !== taskId) return;
    const payload = safeParseJson(evt.data);
    pushTail(streamState.stderrTail, payload?.line ?? payload?.text ?? '');
    renderStreamState();
  });

  source.addEventListener('event', (evt) => {
    if (connectSeq !== streamConnectSeq || activeTaskId !== taskId) return;
    const payload = safeParseJson(evt.data);
    streamState.eventCount += 1;
    if (payload?.type === 'turn.failed' && payload?.error?.message) {
      streamState.error = String(payload.error.message);
    }
    renderStreamState();
  });

  source.addEventListener('final_message', (evt) => {
    if (connectSeq !== streamConnectSeq || activeTaskId !== taskId) return;
    const payload = safeParseJson(evt.data);
    streamState.finalMessage = String(payload?.finalMessage || '');
    renderStreamState();
  });

  source.addEventListener('done', (evt) => {
    if (connectSeq !== streamConnectSeq || activeTaskId !== taskId) return;
    const payload = safeParseJson(evt.data);
    streamClosedByDone = true;
    streamState.connection = 'closed';
    streamState.status = String(payload?.status || streamState.status || 'completed');
    if (payload?.finalMessage && !streamState.finalMessage) {
      streamState.finalMessage = String(payload.finalMessage);
    }
    if (payload?.error && !streamState.error) {
      streamState.error = String(payload.error);
    }
    renderStreamState();
    if (streamSource) {
      streamSource.close();
      streamSource = null;
    }
    setAskBusy(false);
  });

  source.onerror = () => {
    if (streamClosedByDone) return;
    if (connectSeq !== streamConnectSeq || activeTaskId !== taskId) return;
    streamReconnectAttempts += 1;
    const delayMs = Math.min(15000, 1000 * 2 ** Math.min(streamReconnectAttempts - 1, 4));
    streamState.connection = 'reconnecting';
    streamState.reconnectAttempts = streamReconnectAttempts;
    pushTail(streamState.stderrTail, `[stream] 连接中断，${Math.round(delayMs / 1000)}s 后重连`);
    renderStreamState();
    source.close();
    if (streamReconnectTimer) {
      clearTimeout(streamReconnectTimer);
    }
    streamReconnectTimer = setTimeout(() => {
      if (connectSeq !== streamConnectSeq || activeTaskId !== taskId) return;
      attachTaskStream(taskId);
    }, delayMs);
  };
}

async function loadProviders() {
  setLog(els.providerState, '加载中...');
  try {
    let data;
    try {
      data = await jsonFetch('/api/agent/providers');
    } catch (_) {
      data = await jsonFetch('/api/codex/providers');
    }
    const providers = Array.isArray(data.providers) ? data.providers : [];
    els.providerSelect.innerHTML = '';

    providers.forEach((p) => {
      const op = document.createElement('option');
      op.value = p.id;
      op.textContent = `${p.id}${p.id === data.activeProviderId ? ' (active)' : ''}`;
      els.providerSelect.appendChild(op);
    });

    if (data.activeProviderId) {
      els.providerSelect.value = data.activeProviderId;
    }

    if (!providers.length) {
      setLog(els.providerState, '未发现 provider，请先在 Tools-project 配置 agent/codex provider');
      return;
    }

    setLog(els.providerState, {
      activeProviderId: data.activeProviderId,
      providers: providers.map((p) => ({ id: p.id, name: p.name, baseUrl: p.baseUrl })),
    });
  } catch (err) {
    setLog(els.providerState, `加载失败: ${err.message}`);
  }
}

async function upsertProject() {
  const repoPath = els.repoPath.value.trim() || autofillRepoPath();
  const repoName = els.repoName.value.trim();

  if (!repoPath) {
    setLog(els.projectResult, '请先填写仓库绝对路径');
    return;
  }

  setLog(els.projectResult, '提交中...');

  try {
    const body = { path: repoPath };
    if (repoName) body.name = repoName;

    const data = await jsonFetch('/api/projects', { method: 'POST', body });
    currentProjectId = data.id || data.project?.id || '';

    if (!currentProjectId) {
      throw new Error('接口未返回 projectId');
    }

    updateAskEnabled();
    setLog(els.projectResult, {
      ok: true,
      projectId: currentProjectId,
      name: data.name || data.project?.name || repoName || '(same as folder)',
      path: data.path || data.project?.path || repoPath,
      note: '同路径会自动复用已有项目记录',
    });
  } catch (err) {
    currentProjectId = '';
    updateAskEnabled();
    setLog(els.projectResult, `添加失败: ${err.message}`);
  }
}

async function loadAdvisorPrompt() {
  const fallback = `你是“本地仓库提问建议 Agent”。\n\n我会给你一个本地代码仓库，请你输出：\n1) 最推荐的 12 个提问（按优先级排序）\n2) 每个提问对应的价值（为什么先问它）\n3) 每个提问建议的上下文定位方式（应查看哪些目录/文件）\n\n要求：\n- 先给“快速理解项目”的问题，再给“风险与改进”问题\n- 问题要可执行、可验证，不要空泛\n- 输出中文`; 

  try {
    const resp = await fetch('../prompts/local_repo_question_advisor.txt');
    if (!resp.ok) throw new Error('prompt file not found');
    els.promptInput.value = (await resp.text()).trim();
  } catch (_) {
    els.promptInput.value = fallback;
  }
}

async function ask(promptOverride) {
  if (!currentProjectId) {
    setLog(els.askResult, '请先完成 Step 1，拿到 projectId');
    return;
  }

  const prompt = (promptOverride || els.promptInput.value).trim();
  const providerId = els.providerSelect.value.trim();
  const model = els.modelInput.value.trim();
  const bypassSandbox = els.sandboxSelect.value === 'true';

  if (!prompt) {
    setLog(els.askResult, '请先填写提问内容');
    return;
  }

  if (!providerId) {
    setLog(els.askResult, '请先加载并选择 provider');
    return;
  }

  stopTaskStream();
  setAskBusy(true);
  setLog(els.askResult, '任务创建中...');

  try {
    const payload = {
      projectId: currentProjectId,
      prompt,
      runner: 'agent',
      agentModule: 'codex',
      agentProvider: providerId,
      agentAutoFallback: false,
      bypassSandbox,
    };

    if (model) payload.model = model;

    if (currentConversationId) {
      payload.conversationId = currentConversationId;
    }

    let data;
    let usedCompatFallback = false;
    let compatErrorMessage = '';
    try {
      data = await jsonFetch('/api/tasks', {
        method: 'POST',
        body: payload,
      });
    } catch (err) {
      // Backward compatibility for older backends that only support runner=codex.
      const fallbackPayload = {
        ...payload,
        runner: 'codex',
        codexProvider: providerId,
        codexAutoFallback: false,
      };
      data = await jsonFetch('/api/tasks', {
        method: 'POST',
        body: fallbackPayload,
      });
      usedCompatFallback = true;
      compatErrorMessage = err?.message ? String(err.message) : '';
    }
    const taskId = data?.task?.id || '';
    if (!taskId) {
      throw new Error('接口未返回 taskId');
    }
    currentConversationId = data?.task?.conversationId || data?.conversation?.id || currentConversationId;
    activeTaskId = taskId;
    resetStreamState(taskId);
    if (usedCompatFallback) {
      pushTail(streamState.stderrTail, '[compat] 当前后端暂不支持 agent payload，已回退到 runner=codex');
      if (compatErrorMessage) {
        pushTail(streamState.stderrTail, `[compat] ${compatErrorMessage}`);
      }
    }
    renderStreamState();
    attachTaskStream(taskId);
  } catch (err) {
    setAskBusy(false);
    setLog(els.askResult, `执行失败: ${err.message}`);
  }
}

async function runAdvisor() {
  await loadAdvisorPrompt();
  await ask(els.promptInput.value);
}

if (els.btnPickRepoPath) {
  els.btnPickRepoPath.addEventListener('click', () => {
    const before = (els.repoPath?.value || '').trim();
    let path = detectAutoRepoPath() || before || autofillRepoPath();
    if (!path) {
      setLog(els.projectResult, '未检测到默认路径，请手动填写仓库绝对路径');
      return;
    }
    els.repoPath.value = path;
    els.repoPath.dispatchEvent(new Event('input', { bubbles: true }));
    els.repoPath.focus();

    if (!els.repoName.value.trim()) {
      const normalized = path.replace(/[/\\]+$/, '');
      const parts = normalized.split(/[/\\]/).filter(Boolean);
      if (parts.length) {
        els.repoName.value = parts[parts.length - 1];
      }
    }
    flashButtonSuccess(els.btnPickRepoPath);
  });

  els.repoPath.addEventListener('input', () => {
    const value = els.repoPath.value.trim();
    if (value) {
      localStorage.setItem(REPO_PATH_STORAGE_KEY, value);
    } else {
      localStorage.removeItem(REPO_PATH_STORAGE_KEY);
    }
  });
}

els.btnLoadProviders.addEventListener('click', loadProviders);
els.btnAddProject.addEventListener('click', upsertProject);
els.btnRunAdvisor.addEventListener('click', runAdvisor);
els.btnAdvisorPrompt.addEventListener('click', loadAdvisorPrompt);
els.btnAsk.addEventListener('click', ask);

updateAskEnabled();
autofillRepoPath();
initTabs();
renderMarketResearch();
loadProviders();
loadAdvisorPrompt();
