#!/usr/bin/env node
/*
 * Browser runtime check for a local Trae-generated web project.
 *
 * This script does not touch Trae windows. It opens a local frontend URL,
 * captures screenshot, console messages, failed requests and HTTP errors.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function argValue(name, fallback = '') {
  const index = process.argv.indexOf(name);
  if (index >= 0 && index + 1 < process.argv.length) return process.argv[index + 1];
  return fallback;
}

function compactText(value, limit = 1200) {
  const text = String(value || '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length > limit) return `${text.slice(0, limit).trim()}...`;
  return text;
}

function addIntent(intents, kind, reason, sourceText) {
  if (!kind || intents.some((item) => item.kind === kind)) return;
  intents.push({ kind, reason, sourceIndex: Math.max(0, sourceText.indexOf(reason)) });
}

function buildTargetIntents(issueText, title, bodyText) {
  const issue = String(issueText || '');
  const source = `${issue}\n${title || ''}\n${bodyText || ''}`;
  const intents = [];
  const tests = [
    { kind: 'personal', re: /个人中心|用户中心|个人信息|账号设置|我的页面|我的|我听|收藏|订阅|喜欢|历史|profile|account/i, reason: '个人中心/我的相关问题' },
    { kind: 'auth', re: /登录|注册|未登录|验证码|密码|授权|协议|手机号|login|register/i, reason: '登录注册相关问题' },
    { kind: 'search', re: /搜索|查询|筛选|匹配|search/i, reason: '搜索/筛选相关问题' },
    { kind: 'admin', re: /后台|管理端|运营|管理|admin/i, reason: '后台管理相关问题' },
    { kind: 'purchase', re: /购买|下单|订单|购物车|提交|支付|结算|选购|buy|order|cart/i, reason: '购买/提交相关问题' },
    { kind: 'detail', re: /详情|商品|专辑|声音|文章|问答|视频|播放|卡片|列表|detail|play/i, reason: '详情/内容页相关问题' },
    { kind: 'discover', re: /发现|分类|频道|推荐|直播|广播|听友圈|discover/i, reason: '发现/分类相关问题' },
  ];
  for (const item of tests) {
    if (item.re.test(issue)) addIntent(intents, item.kind, item.reason, source);
  }
  if (intents.length === 0 || /核心业务|主链路|关键按钮|关键交互|还没有证明|无法证明|只覆盖/.test(issue)) {
    const body = String(bodyText || '');
    if (/运营后台|后台|管理/.test(body)) addIntent(intents, 'admin', '页面存在后台入口，优先复验后台管理链路', source);
    if (/搜索|发现/.test(body)) addIntent(intents, 'search', '页面存在搜索/发现入口，优先复验检索链路', source);
    if (/立即选购|购买|下单|购物车|订单|全部商品|商品/.test(body)) addIntent(intents, 'purchase', '页面存在购买/商品入口，优先复验交易链路', source);
    if (/我的|个人中心|用户中心|账号/.test(body)) addIntent(intents, 'personal', '页面存在我的/账号入口，优先复验个人中心链路', source);
    if (/详情|视频|播放|文章|专辑|声音|卡片|加载更多/.test(body)) addIntent(intents, 'detail', '页面存在内容列表，优先复验详情链路', source);
  }
  if (intents.length === 0) addIntent(intents, 'smoke', '未识别到特定问题页，保留首屏验收截图', source);
  return intents;
}

function isApiLikePath(pathname) {
  return /^\/api(?:\/|$)|^\/health(?:$|[/?#])/.test(String(pathname || ''));
}

async function locatorVisible(locator, timeout = 500) {
  try {
    return await locator.first().isVisible({ timeout });
  } catch (_error) {
    return false;
  }
}

async function afterInteraction(page, waitMs = 900) {
  await page.waitForLoadState('domcontentloaded', { timeout: 2500 }).catch(() => null);
  await page.waitForTimeout(Math.max(300, Math.min(1800, waitMs)));
}

async function clickFirstVisible(page, locators, label, actions) {
  for (const locator of locators) {
    const target = locator.first();
    if (!(await locatorVisible(target))) continue;
    try {
      await target.scrollIntoViewIfNeeded({ timeout: 800 }).catch(() => null);
      await target.click({ timeout: 1500 });
      actions.push({ action: 'click', label, ok: true });
      await afterInteraction(page);
      return true;
    } catch (error) {
      actions.push({ action: 'click', label, ok: false, error: String(error && error.message ? error.message : error).slice(0, 220) });
    }
  }
  return false;
}

function textLocators(page, patterns) {
  const locators = [];
  for (const pattern of patterns) {
    locators.push(page.getByRole('link', { name: pattern }));
    locators.push(page.getByRole('button', { name: pattern }));
    locators.push(page.locator('a,button,[role="button"],[onclick]').filter({ hasText: pattern }));
    locators.push(page.getByText(pattern));
  }
  return locators;
}

async function fillSearchIfPossible(page, actions) {
  const inputs = [
    page.getByPlaceholder(/搜索|查询|请输入|Search/i),
    page.getByRole('searchbox'),
    page.locator('input[type="search"],input[name*="search" i],input[class*="search" i],input[placeholder*="搜索"],textarea[placeholder*="搜索"]'),
  ];
  for (const locator of inputs) {
    const target = locator.first();
    if (!(await locatorVisible(target))) continue;
    try {
      await target.fill('测试', { timeout: 1200 });
      await target.press('Enter', { timeout: 800 }).catch(() => null);
      actions.push({ action: 'fill-search', label: '搜索输入框', ok: true });
      await afterInteraction(page);
      return true;
    } catch (error) {
      actions.push({ action: 'fill-search', label: '搜索输入框', ok: false, error: String(error && error.message ? error.message : error).slice(0, 220) });
    }
  }
  return false;
}

async function fillFirstVisibleInput(page, patterns, value, label, actions) {
  const locators = patterns.map((pattern) => page.getByPlaceholder(pattern));
  locators.push(page.locator('input:not([type="hidden"]),textarea').first());
  for (const locator of locators) {
    const target = locator.first();
    if (!(await locatorVisible(target))) continue;
    try {
      await target.scrollIntoViewIfNeeded({ timeout: 800 }).catch(() => null);
      await target.fill(value, { timeout: 1200 });
      actions.push({ action: 'fill', label, ok: true });
      await afterInteraction(page, 350);
      return true;
    } catch (error) {
      actions.push({ action: 'fill', label, ok: false, error: String(error && error.message ? error.message : error).slice(0, 220) });
    }
  }
  return false;
}

async function clickFirstContentCard(page, actions) {
  const locators = [
    page.locator('[class*="card" i] a,[class*="item" i] a,article a,li a').filter({ hasText: /\S/ }),
    page.locator('[class*="card" i],[class*="item" i],article,main li').filter({ hasText: /\S/ }),
    page.locator('main a,main button').filter({ hasText: /\S/ }),
  ];
  return clickFirstVisible(page, locators, '首个内容/商品卡片', actions);
}

async function handleRoleSelectionIfPresent(page, actions) {
  const text = await page.locator('body').innerText({ timeout: 1200 }).catch(() => '');
  if (!/请选择您的身份|我是学生|我是老师|确认进入/.test(text)) return false;
  let changed = false;
  if (/我是学生/.test(text)) {
    changed = (await clickFirstVisible(page, textLocators(page, [/我是学生/]), '选择学生身份', actions)) || changed;
  } else if (/我是老师/.test(text)) {
    changed = (await clickFirstVisible(page, textLocators(page, [/我是老师/]), '选择老师身份', actions)) || changed;
  }
  changed = (await fillFirstVisibleInput(page, [/手机号|电话|联系方式|请输入/i], '13800138000', '填写手机号', actions)) || changed;
  if (/确认进入|开始使用|进入/.test(text)) {
    changed = (await clickFirstVisible(page, textLocators(page, [/确认进入/, /开始使用/, /^进入$/]), '确认进入', actions)) || changed;
  }
  if (changed) await afterInteraction(page, 1200);
  return changed;
}

async function pageLooksLikeTarget(page, kind) {
  const url = page.url();
  const text = await page.locator('body').innerText({ timeout: 1200 }).catch(() => '');
  if (kind === 'runtime-error') return /加载失败|页面发生了错误|点击重试|请求失败|接口不存在|Network Error|白屏/i.test(text);
  if (kind === 'personal') return /\/(me|mine|profile|account|user|my)(\/|$)|个人中心|用户中心|账号设置|个人信息|我的作品|我的收藏|我的订阅|收听历史|关注|粉丝|设置/i.test(`${url}\n${text}`);
  if (kind === 'auth') return /\/(login|register|auth)(\/|$)|登录|注册|验证码|密码|授权/i.test(`${url}\n${text}`);
  if (kind === 'search') return /\/(search|find)(\/|$)|搜索结果|热门搜索|搜索历史|请输入搜索|搜索框|查询结果/i.test(`${url}\n${text}`);
  if (kind === 'admin') return /\/(admin|manage|dashboard)(\/|$)|管理后台|后台管理|管理端|数据概览|商品管理|订单管理|用户管理|运营数据/i.test(`${url}\n${text}`);
  if (kind === 'purchase') return /\/(cart|order|checkout|goods|product|shop|poverty)(\/|$)|购买|下单|订单|购物车|全部商品|扶贫专区|价格|库存/i.test(`${url}\n${text}`);
  if (kind === 'detail') return /\/(detail|play|article|video|album|sound|product|goods)(\/|$)|详情|播放|视频|文章|专辑|声音|商品|评论/i.test(`${url}\n${text}`);
  if (kind === 'discover') return /\/(discover|category|live|radio)(\/|$)|发现|分类|推荐|直播|广播|频道/i.test(`${url}\n${text}`);
  return false;
}

async function targetProblemPage(page, issueText, title, bodyText) {
  const actions = [];
  await handleRoleSelectionIfPresent(page, actions);
  const updatedBodyText = await page.locator('body').innerText({ timeout: 1500 }).catch(() => bodyText);
  if (/加载失败|页面发生了错误|点击重试|请求失败|接口不存在|Network Error|白屏/i.test(updatedBodyText)) {
    actions.push({ action: 'target-visible-error', label: '身份进入后出现页面错误', ok: true, finalUrl: page.url() });
    return {
      targetReason: '身份选择后进入错误页',
      targetKind: 'runtime-error',
      targetMatched: true,
      targetActions: actions,
    };
  }
  const intents = buildTargetIntents(issueText, title, updatedBodyText);
  let matched = false;
  let matchedKind = '';
  for (const intent of intents) {
    if (intent.kind === 'smoke') {
      actions.push({ action: 'keep-current-page', label: intent.reason, ok: true });
      break;
    }
    if (intent.kind === 'personal') {
      matched = await clickFirstVisible(page, textLocators(page, [/个人中心/, /用户中心/, /账号设置/, /^我的$/, /我听/, /账号/, /Profile/i, /Account/i]), intent.reason, actions);
    } else if (intent.kind === 'auth') {
      matched = await clickFirstVisible(page, textLocators(page, [/登录/, /注册/, /账号/, /Login/i, /Register/i]), intent.reason, actions);
    } else if (intent.kind === 'search') {
      matched = await clickFirstVisible(page, textLocators(page, [/搜索/, /查询/, /Search/i]), intent.reason, actions);
      matched = (await fillSearchIfPossible(page, actions)) || matched;
    } else if (intent.kind === 'admin') {
      matched = await clickFirstVisible(page, textLocators(page, [/运营后台/, /管理后台/, /后台管理/, /后台/, /管理端/, /Admin/i]), intent.reason, actions);
    } else if (intent.kind === 'purchase') {
      matched = await clickFirstVisible(page, textLocators(page, [/立即购买/, /立即选购/, /加入购物车/, /购物车/, /下单/, /提交订单/, /购买/, /全部商品/, /商品/, /Buy/i, /Cart/i]), intent.reason, actions);
    } else if (intent.kind === 'detail') {
      matched = await clickFirstVisible(page, textLocators(page, [/详情/, /播放/, /查看/, /商品/, /专辑/, /声音/, /文章/, /视频/, /加载更多/, /Detail/i, /Play/i]), intent.reason, actions);
      if (!matched) matched = await clickFirstContentCard(page, actions);
    } else if (intent.kind === 'discover') {
      matched = await clickFirstVisible(page, textLocators(page, [/发现/, /分类/, /推荐/, /直播/, /广播/, /频道/, /Discover/i]), intent.reason, actions);
    }
    if (!matched && await pageLooksLikeTarget(page, intent.kind)) {
      matched = true;
      actions.push({ action: 'target-already-visible', label: intent.reason, ok: true });
    }
    if (matched) {
      if (!(await pageLooksLikeTarget(page, intent.kind))) {
        actions.push({ action: 'target-verify', label: intent.reason, ok: false, finalUrl: page.url() });
        matched = false;
        continue;
      }
      actions.push({ action: 'target-verify', label: intent.reason, ok: true, finalUrl: page.url() });
      matchedKind = intent.kind;
      break;
    }
  }
  return {
    targetReason: intents.map((item) => item.reason).join('；'),
    targetKind: matchedKind || (intents[0] && intents[0].kind) || '',
    targetMatched: matched,
    targetActions: actions,
  };
}

function normalizeBaseUrl(value) {
  const text = String(value || '').trim().replace(/\/+$/, '');
  if (!text) return '';
  try {
    return new URL(text).origin;
  } catch (_error) {
    return '';
  }
}

function buildApiPaths(issueText, title, bodyText, apiResponses) {
  const source = `${issueText || ''}\n${title || ''}\n${bodyText || ''}`;
  const paths = ['/api/health'];
  for (const item of apiResponses || []) {
    try {
      const parsed = new URL(item.url);
      if (isApiLikePath(parsed.pathname)) {
        paths.push(parsed.pathname + parsed.search);
      }
    } catch (_error) {
      // Ignore malformed response URLs.
    }
  }
  if (/家教|老师|教师|课程|预约|tutor|teacher|course|booking/i.test(source)) {
    paths.push('/api/teachers', '/api/courses', '/api/bookings', '/api/orders');
  }
  if (/登录|注册|用户|个人|账号|profile|user|auth/i.test(source)) {
    paths.push('/api/auth/me', '/api/users/profile', '/api/user/profile');
  }
  if (/搜索|查询|筛选|search/i.test(source)) {
    paths.push('/api/search?q=%E6%B5%8B%E8%AF%95');
  }
  if (/后台|管理|运营|admin|dashboard/i.test(source)) {
    paths.push('/api/admin/stats', '/api/admin/dashboard');
  }
  if (/商品|订单|购买|下单|购物车|order|cart|product/i.test(source)) {
    paths.push('/api/products', '/api/orders', '/api/cart');
  }
  const seen = new Set();
  return paths.filter((path) => {
    const key = String(path || '').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 14);
}

async function runApiChecks(page, apiBase, issueText, title, bodyText, apiResponses) {
  const base = normalizeBaseUrl(apiBase);
  if (!base) return [];
  const paths = buildApiPaths(issueText, title, bodyText, apiResponses);
  const checks = [];
  for (const apiPath of paths) {
    const url = `${base}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
    try {
      const response = await page.request.get(url, {
        timeout: 3500,
        failOnStatusCode: false,
        headers: { accept: 'application/json,text/plain,*/*' },
      });
      const text = await response.text().catch(() => '');
      checks.push({
        method: 'GET',
        url,
        path: apiPath,
        status: response.status(),
        ok: response.status() >= 200 && response.status() < 400,
        bodyPreview: text.slice(0, 500),
      });
    } catch (error) {
      checks.push({
        method: 'GET',
        url,
        path: apiPath,
        status: 0,
        ok: false,
        error: String(error && error.message ? error.message : error).slice(0, 260),
      });
    }
  }
  return checks;
}

async function main() {
  const order = argValue('--order', 'unknown');
  const url = argValue('--url');
  const outDir = argValue('--out-dir', path.join('docs/data/generated/automation_probe', order));
  const chromePath = argValue('--chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  const waitMs = Number.parseInt(argValue('--wait-ms', '3500'), 10);
  const issueText = argValue('--issue-text', '');
  const apiBase = argValue('--api-base', '');

  if (!url) {
    throw new Error('--url is required');
  }
  fs.mkdirSync(outDir, { recursive: true });

  const screenshotPath = path.join(outDir, `${order}-frontend.png`);
  const reportPath = path.join(outDir, `${order}-browser-report.json`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    args: ['--no-proxy-server', '--proxy-bypass-list=<-loopback>'],
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
  });

  const consoleMessages = [];
  const requestFailures = [];
  const responseErrors = [];
  const apiResponses = [];

  page.on('console', (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
    });
  });
  page.on('requestfailed', (req) => {
    requestFailures.push({
      method: req.method(),
      url: req.url(),
      errorText: req.failure()?.errorText || '',
    });
  });
  page.on('response', (resp) => {
    const status = resp.status();
    const responseUrl = resp.url();
    try {
      const parsed = new URL(responseUrl);
      if (isApiLikePath(parsed.pathname)) {
        apiResponses.push({
          status,
          url: responseUrl,
        });
      }
    } catch (_error) {
      // Ignore non-standard response URLs.
    }
    if (status >= 400) {
      responseErrors.push({
        status,
        url: responseUrl,
      });
    }
  });

  let navigationError = '';
  let status = null;
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    status = response ? response.status() : null;
  } catch (error) {
    navigationError = String(error && error.message ? error.message : error);
  }
  await page.waitForTimeout(Number.isFinite(waitMs) ? waitMs : 3500);

  const title = await page.title().catch(() => '');
  const initialBodyText = await page.locator('body').innerText({ timeout: 3000 }).catch((error) => `ERR:${error.message || error}`);
  const target = await targetProblemPage(page, issueText, title, initialBodyText);
  const finalTitle = await page.title().catch(() => title);
  const finalUrl = page.url();
  const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch((error) => `ERR:${error.message || error}`);
  const apiChecks = await runApiChecks(page, apiBase, issueText, title, bodyText, apiResponses);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => null);
  await browser.close();

  const report = {
    ok: !navigationError,
    generatedAt: new Date().toISOString(),
    order,
    url,
    initialUrl: url,
    finalUrl,
    status,
    title: finalTitle || title,
    initialTitle: title,
    navigationError,
    screenshotPath,
    issueTextPreview: compactText(issueText, 1000),
    targetReason: target.targetReason,
    targetKind: target.targetKind,
    targetMatched: target.targetMatched,
    targetActions: target.targetActions,
    initialBodyTextPreview: String(initialBodyText || '').slice(0, 1600),
    bodyTextPreview: String(bodyText || '').slice(0, 3000),
    apiBase,
    apiResponses: apiResponses.slice(0, 100),
    apiChecks,
    consoleMessages: consoleMessages.slice(0, 100),
    requestFailures: requestFailures.slice(0, 100),
    responseErrors: responseErrors.slice(0, 100),
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
