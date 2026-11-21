import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { z } from 'zod/v4';

const app = new App({ name: 'Workspace Explorer', version: '1.0.0' }, {});

const ToggleAuxPaneResultSchema = z.object({ isError: z.boolean().optional() }).passthrough();

const KEY_SEP = '\0';

function makeDirKey(rootPath, relPath = '') {
  return `${rootPath}${KEY_SEP}${relPath}`;
}

function parseDirKey(key) {
  const idx = key.indexOf(KEY_SEP);
  if (idx === -1) return { rootPath: key, relPath: '' };
  return { rootPath: key.slice(0, idx), relPath: key.slice(idx + 1) };
}

const state = {
  projects: [],
  activeProject: null,
  viewMode: 'all', // 'single' | 'all'
  detectedBy: 'all',
  showHidden: true,
  searchQuery: '',
  searchFuzzy: true,
  searchCaseSensitive: false,
  searchRegex: false,
  regexError: null,
  searchResults: null,
  searching: false,
  selectedKey: null,
  expandedDirs: new Set(), // makeDirKey(rootPath, relPath) where relPath !== ''
  expandedProjects: new Set(), // rootPath (used in 'all' mode)
  dirCache: new Map(), // makeDirKey(rootPath, relPath) -> entries[]
  loadingKeys: new Set(),
  previewItem: null,
  capabilities: {},
  initialized: false,
  lastAutoSignalTime: 0,
  manualOverrideAt: 0,
};

let searchSeq = 0;
let previewSeq = 0;

// DOM elements
const $projectSelect = document.getElementById('projectSelect');
const $btnAllMode = document.getElementById('btnAllMode');
const $btnCollapseAll = document.getElementById('btnCollapseAll');
const $btnToggleHidden = document.getElementById('btnToggleHidden');
const $btnRefresh = document.getElementById('btnRefresh');
const $searchInput = document.getElementById('searchInput');
const $searchClear = document.getElementById('searchClear');
const $btnFuzzy = document.getElementById('btnFuzzy');
const $btnCase = document.getElementById('btnCase');
const $btnRegex = document.getElementById('btnRegex');
const $subbarPath = document.getElementById('subbarPath');
const $subbarBadge = document.getElementById('subbarBadge');
const $treeContainer = document.getElementById('treeContainer');
const $previewPane = document.getElementById('previewPane');
const $previewResizer = document.getElementById('previewResizer');
const $previewTitle = document.getElementById('previewTitle');
const $previewBody = document.getElementById('previewBody');
const $btnPreviewCopyRel = document.getElementById('btnPreviewCopyRel');
const $btnPreviewCopyAbs = document.getElementById('btnPreviewCopyAbs');
const $btnPreviewOpenNative = document.getElementById('btnPreviewOpenNative');
const $btnPreviewClose = document.getElementById('btnPreviewClose');
const $ctxMenu = document.getElementById('ctxMenu');
const $toast = document.getElementById('toast');

let toastTimer = null;
function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $toast.classList.remove('show'), 2200);
}

function setEmptyMessage(container, text) {
  container.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.textContent = text;
  container.appendChild(div);
}

async function copyText(text, label) {
  let ok = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      ok = true;
    }
  } catch {
    ok = false;
  }
  if (!ok) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ok = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch {
      ok = false;
    }
  }
  if (ok) {
    showToast(`已复制${label}: ${text}`);
  } else {
    showToast(`复制失败，请手动复制: ${text}`);
  }
}

// Host enforces at most 4 in-flight tool calls per app; cap concurrency at 3
async function runWithConcurrency(tasks, limit = 3) {
  const queue = [...tasks];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const fn = queue.shift();
      if (fn) await fn();
    }
  });
  await Promise.all(workers);
}

function getFileIconInfo(item) {
  if (item.isDir) {
    return { svg: 'folder', color: '#eab308' };
  }
  const ext = (item.ext || '').toLowerCase();
  const map = {
    ts: { label: 'TS', color: '#3b82f6' },
    tsx: { label: 'TX', color: '#3b82f6' },
    js: { label: 'JS', color: '#eab308' },
    mjs: { label: 'JS', color: '#eab308' },
    cjs: { label: 'JS', color: '#eab308' },
    jsx: { label: 'JX', color: '#38bdf8' },
    json: { label: '{}', color: '#f59e0b' },
    md: { label: 'MD', color: '#60a5fa' },
    py: { label: 'PY', color: '#22c55e' },
    scene: { label: 'SC', color: '#a855f7' },
    prefab: { label: 'PF', color: '#c084fc' },
    meta: { label: 'MT', color: '#71717a' },
    css: { label: 'CS', color: '#38bdf8' },
    scss: { label: 'SC', color: '#ec4899' },
    html: { label: '<>', color: '#f97316' },
    png: { label: 'IM', color: '#10b981' },
    jpg: { label: 'IM', color: '#10b981' },
    jpeg: { label: 'IM', color: '#10b981' },
    webp: { label: 'IM', color: '#10b981' },
    svg: { label: 'SV', color: '#14b8a6' },
    xlsx: { label: 'XL', color: '#22c55e' },
    csv: { label: 'CS', color: '#22c55e' },
    yaml: { label: 'YM', color: '#fb7185' },
    yml: { label: 'YM', color: '#fb7185' },
    sh: { label: '$_', color: '#4ade80' },
    ps1: { label: 'PS', color: '#60a5fa' },
  };
  return map[ext] || { svg: 'file', color: '#9ca3af' };
}

function createIconNode(item, isOpen = false) {
  const span = document.createElement('span');
  span.className = 'file-icon';
  const info = getFileIconInfo(item);
  span.style.color = info.color;

  if (info.svg === 'folder') {
    span.innerHTML = isOpen
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`;
  } else if (info.svg === 'file') {
    span.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;
  } else {
    span.textContent = info.label;
    span.style.fontSize = '9.5px';
    span.style.fontFamily = 'var(--font-mono)';
  }
  return span;
}

function createChevron(isOpen, isSpacer = false) {
  const span = document.createElement('span');
  span.className = 'chevron' + (isOpen ? ' open' : '') + (isSpacer ? ' spacer' : '');
  span.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;
  return span;
}

async function callTool(name, args = {}) {
  const res = await app.callServerTool({ name, arguments: args });
  if (res?.isError) {
    const errText = res?.content?.[0]?.text || 'Tool error';
    throw new Error(errText);
  }
  return res?.structuredContent;
}

async function ensureDirLoaded(rootPath, relPath = '', force = false, silentRender = false) {
  const key = makeDirKey(rootPath, relPath);
  if (!force && state.dirCache.has(key)) return state.dirCache.get(key);
  if (state.loadingKeys.has(key)) return state.dirCache.get(key) || [];

  state.loadingKeys.add(key);
  if (!silentRender) renderTree();
  try {
    const data = await callTool('list_dir', {
      rootPath,
      relPath,
      showHidden: state.showHidden,
    });
    const entries = data?.entries || [];
    state.dirCache.set(key, entries);
    return entries;
  } catch (err) {
    showToast(`读取目录失败: ${err.message}`);
    return [];
  } finally {
    state.loadingKeys.delete(key);
    if (!silentRender) renderTree();
  }
}

async function reloadVisibleDirs() {
  const targets = []; // Array<{ rootPath, relPath }>
  const seen = new Set();
  const pushTarget = (rootPath, relPath) => {
    const k = makeDirKey(rootPath, relPath);
    if (seen.has(k)) return;
    seen.add(k);
    targets.push({ rootPath, relPath });
  };

  if (state.viewMode === 'single' && state.activeProject) {
    const rp = state.activeProject.rootPath;
    pushTarget(rp, '');
    for (const k of state.expandedDirs) {
      const parsed = parseDirKey(k);
      if (parsed.rootPath === rp) {
        pushTarget(parsed.rootPath, parsed.relPath);
      }
    }
  } else {
    for (const rp of state.expandedProjects) {
      pushTarget(rp, '');
      for (const k of state.expandedDirs) {
        const parsed = parseDirKey(k);
        if (parsed.rootPath === rp) {
          pushTarget(parsed.rootPath, parsed.relPath);
        }
      }
    }
  }

  state.dirCache.clear();
  await runWithConcurrency(
    targets.map((t) => () => ensureDirLoaded(t.rootPath, t.relPath, true, true)),
    3,
  );
  renderTree();
}

async function revealInTree(rootPath, relPath, isDir) {
  // Clear search mode so tree is visible
  searchSeq++;
  state.searchQuery = '';
  state.regexError = null;
  state.searching = false;
  $searchInput.value = '';
  $searchClear.classList.remove('visible');
  state.searchResults = null;
  renderSearchControls();

  if (state.viewMode === 'all') {
    state.expandedProjects.add(rootPath);
  } else {
    const proj = state.projects.find((p) => p.rootPath === rootPath);
    if (proj) {
      state.activeProject = proj;
    }
  }

  const segments = relPath ? relPath.split('/').filter(Boolean) : [];
  const dirsToOpen = [''];
  let acc = '';
  const limit = isDir ? segments.length : Math.max(0, segments.length - 1);
  for (let i = 0; i < limit; i++) {
    acc = acc ? `${acc}/${segments[i]}` : segments[i];
    dirsToOpen.push(acc);
    state.expandedDirs.add(makeDirKey(rootPath, acc));
  }

  state.selectedKey = makeDirKey(rootPath, relPath);
  renderHeader();

  await runWithConcurrency(
    dirsToOpen.map((rel) => () => ensureDirLoaded(rootPath, rel, false, true)),
    3,
  );
  renderTree();

  requestAnimationFrame(() => {
    const selectedEl = $treeContainer.querySelector('.tree-row.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });
}

async function openFileInNativePane(item, rootPath) {
  try {
    const result = await app.request(
      {
        method: 'com.google.antigravity/toggle-aux-pane',
        params: { tabType: 'fileView', uri: item.fileUri },
      },
      ToggleAuxPaneResultSchema,
    );
    if (result?.isError) {
      await openFileInlinePreview(item, rootPath);
    } else {
      showToast(`已打开: ${item.name}`);
    }
  } catch {
    await openFileInlinePreview(item, rootPath);
  }
}

async function openFileInlinePreview(item, rootPath) {
  const seq = ++previewSeq;
  state.previewItem = { ...item, rootPath };
  $previewTitle.textContent = item.relPath || item.name;
  $previewBody.textContent = '正在加载文件内容...';
  $previewPane.classList.add('open');

  try {
    const data = await callTool('read_file_preview', {
      rootPath,
      relPath: item.relPath,
    });
    if (seq !== previewSeq) return;
    if (data.isBinary) {
      $previewBody.textContent = `[二进制文件，大小 ${(data.size / 1024).toFixed(1)} KB，不支持文本预览]`;
    } else {
      const lines = data.content.split(/\r?\n/);
      const pad = String(lines.length).length;
      const numbered = lines
        .map((line, idx) => `${String(idx + 1).padStart(pad, ' ')} │ ${line}`)
        .join('\n');
      $previewBody.textContent =
        numbered + (data.truncated ? '\n\n... [文件超过 200KB，已截断显示]' : '');
    }
  } catch (err) {
    if (seq !== previewSeq) return;
    $previewBody.textContent = `无法读取文件: ${err.message}`;
  }
}

async function attachPathToChat(item) {
  if (!state.capabilities?.updateModelContext) {
    await copyText(item.relPath || item.absPath, '路径');
    return;
  }
  try {
    await app.updateModelContext({
      content: [
        {
          type: 'text',
          text: `User selected from Workspace Explorer:\n- Relative path: ${item.relPath || '.'}\n- Absolute path: ${item.absPath}`,
        },
      ],
    });
    showToast(`已附到对话上下文: ${item.relPath || item.name}`);
  } catch {
    await copyText(item.relPath || item.absPath, '路径');
  }
}

function hideContextMenu() {
  $ctxMenu.classList.remove('open');
}

function showContextMenu(x, y, item, rootPath, options = {}) {
  $ctxMenu.innerHTML = '';

  const addItem = (label, onClick) => {
    const btn = document.createElement('button');
    btn.className = 'ctx-item';
    btn.textContent = label;
    btn.onclick = () => {
      hideContextMenu();
      onClick();
    };
    $ctxMenu.appendChild(btn);
  };
  const addSep = () => {
    const div = document.createElement('div');
    div.className = 'ctx-sep';
    $ctxMenu.appendChild(div);
  };

  if (options.isProjectRoot && options.project) {
    const isOpen = state.expandedProjects.has(options.project.rootPath);
    addItem(isOpen ? '折叠工程目录' : '展开工程目录', () => toggleProjectRoot(options.project));
    addItem('聚焦此工程 (单工程视图)', () => selectProject(options.project.rootPath));
    addSep();
  } else if (!item.isDir) {
    addItem('打开文件 (原生标签页)', () => openFileInNativePane(item, rootPath));
    addItem('内置预览文件内容', () => openFileInlinePreview(item, rootPath));
    if (options.fromSearch) {
      addItem('在目录树中定位', () => revealInTree(rootPath, item.relPath, false));
    }
    addSep();
  } else {
    if (options.fromSearch) {
      addItem('在目录树中展开定位', () => revealInTree(rootPath, item.relPath, true));
    } else {
      const k = makeDirKey(rootPath, item.relPath);
      const isOpen = state.expandedDirs.has(k);
      addItem(isOpen ? '折叠文件夹' : '展开文件夹', () => toggleDir(rootPath, item.relPath));
    }
    addSep();
  }

  if (item.relPath) {
    addItem('复制相对路径 (Copy Relative Path)', () => copyText(item.relPath, '相对路径'));
  }
  addItem('复制绝对路径 (Copy Full Path)', () => copyText(item.absPath, '绝对路径'));
  addItem('复制名称 (Copy Name)', () => copyText(item.name, '名称'));

  if (state.capabilities?.updateModelContext) {
    addSep();
    addItem('附到对话上下文', () => attachPathToChat(item));
  }

  $ctxMenu.classList.add('open');
  const rect = $ctxMenu.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - 8;
  const maxY = window.innerHeight - rect.height - 8;
  $ctxMenu.style.left = `${Math.max(8, Math.min(x, maxX))}px`;
  $ctxMenu.style.top = `${Math.max(8, Math.min(y, maxY))}px`;
}

async function toggleDir(rootPath, relPath) {
  const key = makeDirKey(rootPath, relPath);
  if (state.expandedDirs.has(key)) {
    state.expandedDirs.delete(key);
    renderTree();
  } else {
    state.expandedDirs.add(key);
    renderTree();
    await ensureDirLoaded(rootPath, relPath);
  }
}

async function toggleProjectRoot(project) {
  if (state.expandedProjects.has(project.rootPath)) {
    state.expandedProjects.delete(project.rootPath);
    renderTree();
  } else {
    state.expandedProjects.add(project.rootPath);
    renderTree();
    await ensureDirLoaded(project.rootPath, '');
  }
}

function renderHeader() {
  $projectSelect.innerHTML = '';

  const allOpt = document.createElement('option');
  allOpt.value = '__ALL__';
  allOpt.textContent = `全部工程 (${state.projects.length})`;
  $projectSelect.appendChild(allOpt);

  for (const p of state.projects) {
    const opt = document.createElement('option');
    opt.value = p.rootPath;
    opt.textContent = p.name;
    $projectSelect.appendChild(opt);
  }

  if (state.viewMode === 'all') {
    $projectSelect.value = '__ALL__';
    $btnAllMode.classList.add('active');
    $subbarPath.textContent = `共 ${state.projects.length} 个工程（点击展开，或点右侧“聚焦”单看某工程）`;
    $subbarBadge.textContent = '全部工程';
  } else if (state.activeProject) {
    $projectSelect.value = state.activeProject.rootPath;
    $btnAllMode.classList.remove('active');
    $subbarPath.textContent = state.activeProject.rootPath;
    const badgeMap = {
      arg: '当前对话工程',
      'active-chat': '当前对话工程',
      'selected-project': '当前选中工程',
      roots: '当前工作区',
      cwd: '当前工作区',
      manual: '手动选择',
      'single-known': '当前工程',
    };
    $subbarBadge.textContent = badgeMap[state.detectedBy] || '当前工程';
  } else {
    $projectSelect.value = '__ALL__';
    $subbarPath.textContent = '未检测到本地工程';
    $subbarBadge.textContent = '';
  }

  $btnToggleHidden.classList.toggle('active', state.showHidden);
}

function createRowActions(item, rootPath, fromSearch = false) {
  const wrap = document.createElement('span');
  wrap.className = 'row-actions';

  if (fromSearch) {
    const btnReveal = document.createElement('button');
    btnReveal.className = 'mini-btn';
    btnReveal.title = '在目录树中定位';
    btnReveal.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`;
    btnReveal.onclick = (e) => {
      e.stopPropagation();
      revealInTree(rootPath, item.relPath, item.isDir);
    };
    wrap.appendChild(btnReveal);
  }

  if (!item.isDir) {
    const btnPrev = document.createElement('button');
    btnPrev.className = 'mini-btn';
    btnPrev.title = '内置预览';
    btnPrev.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
    btnPrev.onclick = (e) => {
      e.stopPropagation();
      openFileInlinePreview(item, rootPath);
    };
    wrap.appendChild(btnPrev);
  }

  if (item.relPath) {
    const btnRel = document.createElement('button');
    btnRel.className = 'mini-btn';
    btnRel.title = '复制相对路径';
    btnRel.textContent = './';
    btnRel.style.fontFamily = 'var(--font-mono)';
    btnRel.onclick = (e) => {
      e.stopPropagation();
      copyText(item.relPath, '相对路径');
    };
    wrap.appendChild(btnRel);
  }

  const btnAbs = document.createElement('button');
  btnAbs.className = 'mini-btn';
  btnAbs.title = '复制绝对路径';
  btnAbs.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
  btnAbs.onclick = (e) => {
    e.stopPropagation();
    copyText(item.absPath, '绝对路径');
  };
  wrap.appendChild(btnAbs);

  return wrap;
}

function appendDirChildren(container, rootPath, relPath, depth) {
  const key = makeDirKey(rootPath, relPath);
  if (state.loadingKeys.has(key) && !state.dirCache.has(key)) {
    const loading = document.createElement('div');
    loading.className = 'tree-row';
    loading.style.paddingLeft = `${8 + depth * 14}px`;
    loading.style.color = 'var(--text-tertiary)';
    loading.textContent = '加载中...';
    container.appendChild(loading);
    return;
  }

  const entries = state.dirCache.get(key) || [];
  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tree-row';
    empty.style.paddingLeft = `${24 + depth * 14}px`;
    empty.style.color = 'var(--text-tertiary)';
    empty.style.fontStyle = 'italic';
    empty.textContent = '(空目录)';
    container.appendChild(empty);
    return;
  }

  for (const item of entries) {
    const itemKey = makeDirKey(rootPath, item.relPath);
    const isOpen = item.isDir && state.expandedDirs.has(itemKey);

    const row = document.createElement('div');
    row.className =
      'tree-row' +
      (state.selectedKey === itemKey ? ' selected' : '') +
      (item.isHidden ? ' hidden-item' : '');
    row.style.paddingLeft = `${8 + depth * 14}px`;
    row.title = item.absPath;

    row.appendChild(createChevron(isOpen, !item.isDir));
    row.appendChild(createIconNode(item, isOpen));

    const nameEl = document.createElement('span');
    nameEl.className = 'row-name';
    nameEl.textContent = item.name;
    row.appendChild(nameEl);

    row.appendChild(createRowActions(item, rootPath, false));

    row.onclick = () => {
      state.selectedKey = itemKey;
      if (item.isDir) {
        toggleDir(rootPath, item.relPath);
      } else {
        renderTree();
        openFileInNativePane(item, rootPath);
      }
    };

    row.oncontextmenu = (e) => {
      e.preventDefault();
      state.selectedKey = itemKey;
      renderTree();
      showContextMenu(e.clientX, e.clientY, item, rootPath);
    };

    container.appendChild(row);

    if (item.isDir && isOpen) {
      appendDirChildren(container, rootPath, item.relPath, depth + 1);
    }
  }
}

function hasActiveSearch() {
  return state.searchRegex ? state.searchQuery.length > 0 : state.searchQuery.trim().length > 0;
}

function renderSearchControls() {
  $btnCase.classList.toggle('active', state.searchCaseSensitive);
  $btnRegex.classList.toggle('active', state.searchRegex);
  $btnFuzzy.classList.toggle('active', !state.searchRegex && state.searchFuzzy);
  $btnFuzzy.disabled = state.searchRegex;
  $searchInput.classList.toggle('invalid', Boolean(state.regexError));

  if (state.searchRegex) {
    $searchInput.placeholder = state.searchCaseSensitive
      ? '正则搜索 (区分大小写, 如 \\.scene$)...'
      : '正则搜索 (如 \\.scene$ 或 ^Cfg)...';
  } else if (state.searchFuzzy) {
    $searchInput.placeholder = state.searchCaseSensitive
      ? '模糊搜索 (区分大小写)...'
      : '模糊搜索文件名或路径...';
  } else {
    $searchInput.placeholder = state.searchCaseSensitive
      ? '精确子串搜索 (区分大小写)...'
      : '精确子串搜索文件名或路径...';
  }
}

function createHighlightedSpan(text, ranges, className, prefixText = '') {
  const span = document.createElement('span');
  span.className = className;
  if (prefixText) {
    span.appendChild(document.createTextNode(prefixText));
  }
  if (!Array.isArray(ranges) || ranges.length === 0) {
    span.appendChild(document.createTextNode(text));
    return span;
  }

  let cursor = 0;
  for (const [start, end] of ranges) {
    const s = Math.max(cursor, Math.min(text.length, start));
    const e = Math.max(s, Math.min(text.length, end));
    if (s > cursor) {
      span.appendChild(document.createTextNode(text.slice(cursor, s)));
    }
    if (e > s) {
      const mark = document.createElement('mark');
      mark.className = 'hl';
      mark.textContent = text.slice(s, e);
      span.appendChild(mark);
    }
    cursor = e;
  }
  if (cursor < text.length) {
    span.appendChild(document.createTextNode(text.slice(cursor)));
  }
  return span;
}

function renderSearchResults(container) {
  if (state.searching) {
    setEmptyMessage(container, '正在搜索...');
    return;
  }
  if (state.regexError) {
    setEmptyMessage(container, `正则表达式语法错误: ${state.regexError}`);
    return;
  }
  const results = state.searchResults || [];
  if (results.length === 0) {
    setEmptyMessage(container, `未找到匹配 "${state.searchQuery}" 的文件或目录`);
    return;
  }

  const showProjPrefix = state.viewMode === 'all';
  for (const item of results) {
    const itemKey = makeDirKey(item.rootPath, item.relPath);
    const row = document.createElement('div');
    row.className =
      'tree-row' +
      (state.selectedKey === itemKey ? ' selected' : '') +
      (item.isHidden ? ' hidden-item' : '');
    row.style.paddingLeft = '10px';
    row.title = item.absPath;

    row.appendChild(createIconNode(item, false));
    row.appendChild(createHighlightedSpan(item.name, item.nameRanges, 'row-name'));

    const prefix = showProjPrefix && item.projectName ? `[${item.projectName}] ` : '';
    row.appendChild(createHighlightedSpan(item.relPath, item.pathRanges, 'row-sub', prefix));

    row.appendChild(createRowActions(item, item.rootPath, true));

    row.onclick = () => {
      state.selectedKey = itemKey;
      if (item.isDir) {
        revealInTree(item.rootPath, item.relPath, true);
      } else {
        renderTree();
        openFileInNativePane(item, item.rootPath);
      }
    };

    row.oncontextmenu = (e) => {
      e.preventDefault();
      state.selectedKey = itemKey;
      renderTree();
      showContextMenu(e.clientX, e.clientY, item, item.rootPath, { fromSearch: true });
    };

    container.appendChild(row);
  }
}

function renderTree() {
  $treeContainer.innerHTML = '';

  if (hasActiveSearch()) {
    renderSearchResults($treeContainer);
    return;
  }

  if (state.projects.length === 0) {
    setEmptyMessage(
      $treeContainer,
      state.initialized
        ? '未找到任何本地工程，请在 Antigravity 左侧 Projects 添加工程。'
        : '正在加载工程目录...',
    );
    return;
  }

  if (state.viewMode === 'all') {
    for (const project of state.projects) {
      const isOpen = state.expandedProjects.has(project.rootPath);
      const row = document.createElement('div');
      row.className = 'tree-row project-root-row';
      row.style.paddingLeft = '8px';
      row.title = project.rootPath;

      row.appendChild(createChevron(isOpen, false));
      row.appendChild(createIconNode({ isDir: true }, isOpen));

      const nameEl = document.createElement('span');
      nameEl.className = 'row-name';
      nameEl.textContent = project.name;
      row.appendChild(nameEl);

      const actions = document.createElement('span');
      actions.className = 'row-actions';

      const btnFocus = document.createElement('button');
      btnFocus.className = 'mini-btn';
      btnFocus.title = '聚焦此工程';
      btnFocus.textContent = '聚焦';
      btnFocus.onclick = (e) => {
        e.stopPropagation();
        selectProject(project.rootPath);
      };
      actions.appendChild(btnFocus);

      const btnCopy = document.createElement('button');
      btnCopy.className = 'mini-btn';
      btnCopy.title = '复制工程绝对路径';
      btnCopy.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
      btnCopy.onclick = (e) => {
        e.stopPropagation();
        copyText(project.rootPath, '工程路径');
      };
      actions.appendChild(btnCopy);

      row.appendChild(actions);

      row.onclick = () => toggleProjectRoot(project);
      row.oncontextmenu = (e) => {
        e.preventDefault();
        showContextMenu(
          e.clientX,
          e.clientY,
          { name: project.name, relPath: '', absPath: project.rootPath, isDir: true },
          project.rootPath,
          { isProjectRoot: true, project },
        );
      };

      $treeContainer.appendChild(row);

      if (isOpen) {
        appendDirChildren($treeContainer, project.rootPath, '', 1);
      }
    }
    return;
  }

  if (!state.activeProject) {
    setEmptyMessage($treeContainer, '请在上方选择一个工程');
    return;
  }

  appendDirChildren($treeContainer, state.activeProject.rootPath, '', 0);
}

async function selectProject(rootPath, isManual = true) {
  if (isManual) {
    state.manualOverrideAt = Date.now();
  }
  if (rootPath === '__ALL__') {
    state.viewMode = 'all';
    if (state.activeProject && state.expandedProjects.size === 0) {
      state.expandedProjects.add(state.activeProject.rootPath);
      ensureDirLoaded(state.activeProject.rootPath, '');
    }
    renderHeader();
    renderTree();
    if (hasActiveSearch()) {
      await runSearch();
    }
    return;
  }
  const found = state.projects.find((p) => p.rootPath === rootPath);
  if (!found) return;
  state.activeProject = found;
  state.viewMode = 'single';
  if (isManual) {
    state.detectedBy = 'manual';
  }
  renderHeader();
  renderTree();
  if (isManual) {
    try {
      await callTool('set_active_project', { rootPath: found.rootPath });
    } catch {
      // ignore
    }
  }
  await ensureDirLoaded(found.rootPath, '');
  if (hasActiveSearch()) {
    await runSearch();
  }
}

let searchDebounce = null;
async function runSearch() {
  const raw = state.searchQuery;
  const active = hasActiveSearch();
  $searchClear.classList.toggle('visible', raw.length > 0);
  const seq = ++searchSeq;

  if (!active) {
    state.searchResults = null;
    state.regexError = null;
    state.searching = false;
    renderSearchControls();
    renderTree();
    return;
  }

  state.searching = true;
  state.regexError = null;
  renderSearchControls();
  renderTree();

  try {
    const args = {
      query: state.searchRegex ? raw : raw.trim(),
      caseSensitive: state.searchCaseSensitive,
      useRegex: state.searchRegex,
      fuzzy: state.searchFuzzy,
      showHidden: state.showHidden,
      maxResults: 150,
    };
    if (state.viewMode === 'single' && state.activeProject) {
      args.rootPath = state.activeProject.rootPath;
    }
    const data = await callTool('search_files', args);
    if (seq !== searchSeq) return;
    state.regexError = data?.regexError || null;
    state.searchResults = data?.results || [];
  } catch (err) {
    if (seq !== searchSeq) return;
    showToast(`搜索失败: ${err.message}`);
    state.searchResults = [];
  } finally {
    if (seq === searchSeq) {
      state.searching = false;
      renderSearchControls();
      renderTree();
    }
  }
}

function hydrateFromInitialData(data) {
  if (!data) return;
  state.initialized = true;
  state.projects = Array.isArray(data.projects) ? data.projects : [];
  state.activeProject = data.activeProject || null;
  state.viewMode = data.viewMode || (state.activeProject ? 'single' : 'all');
  state.detectedBy = data.detectedBy || 'all';
  if (data.signalTime) {
    state.lastAutoSignalTime = Math.max(state.lastAutoSignalTime, data.signalTime);
  }

  if (state.activeProject && Array.isArray(data.entries)) {
    state.dirCache.set(makeDirKey(state.activeProject.rootPath, ''), data.entries);
  }

  // In 'all' mode, auto-expand the remembered project so its files are immediately visible
  if (state.viewMode === 'all' && state.activeProject && state.expandedProjects.size === 0) {
    state.expandedProjects.add(state.activeProject.rootPath);
    if (!state.dirCache.has(makeDirKey(state.activeProject.rootPath, ''))) {
      ensureDirLoaded(state.activeProject.rootPath, '');
    }
  }

  renderHeader();
  renderTree();

  if (
    state.viewMode === 'single' &&
    state.activeProject &&
    !state.dirCache.has(makeDirKey(state.activeProject.rootPath, ''))
  ) {
    ensureDirLoaded(state.activeProject.rootPath, '');
  }
}

// Event bindings
$projectSelect.onchange = (e) => selectProject(e.target.value);

$btnAllMode.onclick = () => {
  if (state.viewMode === 'all') {
    if (state.activeProject) {
      selectProject(state.activeProject.rootPath);
    } else if (state.projects.length > 0) {
      selectProject(state.projects[0].rootPath);
    }
  } else {
    selectProject('__ALL__');
  }
};

$btnCollapseAll.onclick = () => {
  state.expandedDirs.clear();
  state.expandedProjects.clear();
  renderTree();
  showToast('已全部折叠');
};

$btnToggleHidden.onclick = async () => {
  state.showHidden = !state.showHidden;
  renderHeader();
  await reloadVisibleDirs();
  if (hasActiveSearch()) {
    await runSearch();
  }
};

$btnRefresh.onclick = async () => {
  try {
    const ctx = await callTool('list_projects', {});
    if (Array.isArray(ctx?.projects)) {
      state.projects = ctx.projects;
      if (state.activeProject) {
        state.activeProject =
          state.projects.find((p) => p.rootPath === state.activeProject.rootPath) ||
          state.activeProject;
      }
    }
  } catch {
    // ignore
  }
  renderHeader();
  await reloadVisibleDirs();
  if (hasActiveSearch()) {
    await runSearch();
  }
  showToast('目录已刷新');
};

$searchInput.oninput = (e) => {
  state.searchQuery = e.target.value;
  $searchClear.classList.toggle('visible', state.searchQuery.length > 0);
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(runSearch, 180);
};

$searchClear.onclick = () => {
  searchSeq++;
  state.searchQuery = '';
  state.regexError = null;
  $searchInput.value = '';
  $searchClear.classList.remove('visible');
  state.searchResults = null;
  state.searching = false;
  renderSearchControls();
  renderTree();
  $searchInput.focus();
};

$btnFuzzy.onclick = () => {
  if (state.searchRegex) return;
  state.searchFuzzy = !state.searchFuzzy;
  renderSearchControls();
  showToast(state.searchFuzzy ? '已开启模糊查找 (~)' : '已切换为精确子串查找');
  if (hasActiveSearch()) {
    runSearch();
  }
};

$btnCase.onclick = () => {
  state.searchCaseSensitive = !state.searchCaseSensitive;
  renderSearchControls();
  showToast(state.searchCaseSensitive ? '已开启区分大小写 (Aa)' : '已关闭区分大小写');
  if (hasActiveSearch()) {
    runSearch();
  }
};

$btnRegex.onclick = () => {
  state.searchRegex = !state.searchRegex;
  state.regexError = null;
  renderSearchControls();
  showToast(state.searchRegex ? '已开启正则表达式查找 (.*)' : '已关闭正则表达式查找');
  if (hasActiveSearch()) {
    runSearch();
  } else {
    renderTree();
  }
};

renderSearchControls();

$btnPreviewClose.onclick = () => {
  previewSeq++;
  $previewPane.classList.remove('open');
  state.previewItem = null;
};

$btnPreviewCopyRel.onclick = () => {
  if (state.previewItem) copyText(state.previewItem.relPath, '相对路径');
};

$btnPreviewCopyAbs.onclick = () => {
  if (state.previewItem) copyText(state.previewItem.absPath, '绝对路径');
};

$btnPreviewOpenNative.onclick = () => {
  if (state.previewItem) {
    openFileInNativePane(state.previewItem, state.previewItem.rootPath);
  }
};

// Drag to resize preview pane
let isResizing = false;
$previewResizer.addEventListener('mousedown', (e) => {
  e.preventDefault();
  isResizing = true;
});
window.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const newHeight = window.innerHeight - e.clientY;
  const clamped = Math.max(120, Math.min(window.innerHeight * 0.8, newHeight));
  $previewPane.style.height = `${clamped}px`;
});
window.addEventListener('mouseup', () => {
  isResizing = false;
});

document.addEventListener('click', (e) => {
  if (!$ctxMenu.contains(e.target)) hideContextMenu();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideContextMenu();
  }
});

function applyHostStyling(ctx) {
  if (!ctx) return;
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
}

// Register MCP App handlers BEFORE connect()
app.ontoolinput = () => {
  if (!state.initialized) {
    setEmptyMessage($treeContainer, '正在加载工程目录...');
  }
};

app.ontoolresult = (result) => {
  if (result?.structuredContent) {
    hydrateFromInitialData(result.structuredContent);
  }
};

app.onhostcontextchanged = (ctx) => {
  applyHostStyling(ctx);
};

window.addEventListener('error', (ev) => {
  if (!state.initialized && $treeContainer) {
    setEmptyMessage($treeContainer, `脚本错误: ${ev.message || ev.error}`);
  }
});

let syncingWorkspace = false;
async function syncActiveWorkspace() {
  if (!state.initialized || syncingWorkspace) return;
  if (document.visibilityState === 'hidden') return;
  syncingWorkspace = true;
  try {
    const info = await callTool('check_active_workspace', {});
    if (!info?.activeProject) return;
    const sig = Number(info.signalTime) || 0;
    const baseline = Math.max(state.lastAutoSignalTime, state.manualOverrideAt);
    if (sig > baseline) {
      state.lastAutoSignalTime = sig;
      if (Array.isArray(info.projects) && info.projects.length > 0) {
        state.projects = info.projects;
      }
      const nextRoot = info.activeProject.rootPath;
      if (state.viewMode !== 'single' || state.activeProject?.rootPath !== nextRoot) {
        state.detectedBy = info.detectedBy || 'active-chat';
        await selectProject(nextRoot, false);
      } else if (state.detectedBy !== info.detectedBy) {
        state.detectedBy = info.detectedBy || state.detectedBy;
        renderHeader();
      }
    }
  } catch {
    // ignore transient poll errors
  } finally {
    syncingWorkspace = false;
  }
}

(async () => {
  try {
    await app.connect();
    state.capabilities = app.getHostCapabilities() || {};
    applyHostStyling(app.getHostContext());

    window.addEventListener('focus', syncActiveWorkspace);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') syncActiveWorkspace();
    });
    setInterval(syncActiveWorkspace, 2500);

    // Fallback if opened directly without ontoolresult arriving immediately
    setTimeout(async () => {
      if (!state.initialized) {
        try {
          const ctx = await callTool('list_projects', {});
          if (!state.initialized) {
            hydrateFromInitialData(ctx);
          }
        } catch {
          // ignore if ontoolresult already handled
        }
      }
    }, 500);
  } catch (err) {
    setEmptyMessage($treeContainer, `连接宿主失败: ${err?.message || err}`);
  }
})();
