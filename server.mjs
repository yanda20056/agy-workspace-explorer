import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE_DIR =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const APP_URI = 'ui://workspace-explorer/app.html';
const APP_HTML_PATH =
  process.env.WORKSPACE_EXPLORER_HTML ||
  (fsSync.existsSync(path.join(BASE_DIR, 'app.html'))
    ? path.join(BASE_DIR, 'app.html')
    : path.join(BASE_DIR, 'dist', 'app.html'));
const PROJECTS_DIR = path.join(os.homedir(), '.gemini', 'config', 'projects');
const HOOK_ACTIVE_FILE = path.join(os.homedir(), '.gemini', '.workspace-explorer-active.json');

// Parse --data-dir=...
const dataDirArg = process.argv.find((a) => a.startsWith('--data-dir='));
const DATA_DIR = dataDirArg ? dataDirArg.slice('--data-dir='.length) : path.join(__dirname, '.data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const IGNORED_SEARCH_DIRS = new Set([
  '.git',
  '.svn',
  'node_modules',
  '.venv',
  'venv',
  '__pycache__',
  'library',
  'temp',
  'local',
  '.idea',
  '.vs',
  'bin',
  'obj',
  'dist',
  'build',
  '.next',
  '.nuxt',
]);

// Roots explicitly passed to open_explorer during this server session
const sessionAllowedRoots = new Map(); // normalizedKey -> resolvedPath

function uriToLocalPath(uri) {
  if (!uri || typeof uri !== 'string') return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.startsWith('file://')) {
      const normalized = trimmed.replace(/^file:\/\/\/([a-zA-Z])%3[aA](\/|$)/, 'file:///$1:$2');
      return path.normalize(fileURLToPath(normalized));
    }
    return path.normalize(trimmed);
  } catch {
    try {
      let stripped = trimmed.replace(/^file:\/\/\/?/, '');
      stripped = decodeURIComponent(stripped);
      if (/^\/[a-zA-Z]:/.test(stripped)) stripped = stripped.slice(1);
      return path.normalize(stripped);
    } catch {
      return null;
    }
  }
}

function localPathToUri(p) {
  return pathToFileURL(path.resolve(p)).href;
}

function normalizePathKey(p) {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function extractFolderUrisFromProject(obj) {
  const uris = [];
  const resources = obj?.projectResources?.resources;
  if (Array.isArray(resources)) {
    for (const r of resources) {
      if (!r || typeof r !== 'object') continue;
      for (const val of Object.values(r)) {
        if (val && typeof val === 'object') {
          if (typeof val.folderUri === 'string') uris.push(val.folderUri);
          else if (typeof val.uri === 'string') uris.push(val.uri);
          else if (typeof val.path === 'string') uris.push(val.path);
        }
      }
      if (typeof r.folderUri === 'string') uris.push(r.folderUri);
      if (typeof r.uri === 'string') uris.push(r.uri);
    }
  }
  return uris;
}

async function loadAntigravityProjects() {
  const projects = [];
  const seen = new Set();

  try {
    const files = await fs.readdir(PROJECTS_DIR);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const fullJsonPath = path.join(PROJECTS_DIR, file);
        const [raw, fileStat] = await Promise.all([
          fs.readFile(fullJsonPath, 'utf8'),
          fs.stat(fullJsonPath),
        ]);
        const json = JSON.parse(raw);
        const uris = extractFolderUrisFromProject(json);
        for (const uri of uris) {
          const localPath = uriToLocalPath(uri);
          if (!localPath) continue;
          const key = normalizePathKey(localPath);
          if (seen.has(key)) continue;
          try {
            const stat = await fs.stat(localPath);
            if (!stat.isDirectory()) continue;
          } catch {
            continue;
          }
          seen.add(key);
          projects.push({
            id: json.id || file.replace(/\.json$/, ''),
            name: json.name || path.basename(localPath),
            rootPath: path.resolve(localPath),
            uri: localPathToUri(localPath),
            lastSelectedAt: Math.round(fileStat.mtimeMs || 0),
          });
        }
      } catch {
        // skip unreadable project file
      }
    }
  } catch {
    // projects directory missing
  }

  projects.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return projects;
}

async function readHookActiveWorkspace() {
  try {
    const raw = await fs.readFile(HOOK_ACTIVE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.workspacePath !== 'string') return null;
    const resolved = path.resolve(parsed.workspacePath);
    const st = await fs.stat(resolved);
    if (!st.isDirectory()) return null;
    const key = normalizePathKey(resolved);
    sessionAllowedRoots.set(key, resolved);
    return {
      rootPath: resolved,
      conversationId: parsed.conversationId || null,
      updatedAt: Number(parsed.updatedAt) || Math.round(st.mtimeMs || 0),
    };
  } catch {
    return null;
  }
}

// Serialized state persistence to prevent concurrent write races
let stateWriteChain = Promise.resolve();

async function readState() {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { lastRootPath: null, recents: [] };
  } catch {
    return { lastRootPath: null, recents: [] };
  }
}

function updateState(mutator) {
  stateWriteChain = stateWriteChain.then(async () => {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const prev = await readState();
      const next = await mutator(prev);
      await fs.writeFile(STATE_FILE, JSON.stringify(next, null, 2), 'utf8');
      return next;
    } catch {
      return null;
    }
  });
  return stateWriteChain;
}

async function addRecentFile(entry) {
  await updateState((prev) => {
    const list = Array.isArray(prev.recents) ? prev.recents : [];
    const filtered = list.filter((x) => normalizePathKey(x.absPath) !== normalizePathKey(entry.absPath));
    filtered.unshift({ ...entry, openedAt: Date.now() });
    return { ...prev, recents: filtered.slice(0, 15) };
  });
}

function isSubPath(rootPath, targetPath) {
  const root = normalizePathKey(rootPath);
  const target = normalizePathKey(targetPath);
  if (root === target) return true;
  const withSep = root.endsWith(path.sep) ? root : root + path.sep;
  return target.startsWith(withSep);
}

function toPosixRel(rootPath, targetPath) {
  const rel = path.relative(rootPath, targetPath);
  return rel.split(path.sep).join('/');
}

const mcp = new McpServer({
  name: 'workspace-explorer',
  version: '1.0.0',
});

async function detectClientRoots() {
  try {
    const caps = mcp.server.getClientCapabilities?.();
    if (!caps?.roots) return [];
    const res = await mcp.server.listRoots();
    const list = [];
    for (const r of res?.roots || []) {
      const p = uriToLocalPath(r.uri);
      if (!p) continue;
      try {
        const st = await fs.stat(p);
        if (st.isDirectory()) {
          list.push({
            id: `root:${normalizePathKey(p)}`,
            name: r.name || path.basename(p),
            rootPath: path.resolve(p),
            uri: localPathToUri(p),
          });
        }
      } catch {
        // ignore missing
      }
    }
    return list;
  } catch {
    return [];
  }
}

async function getAllowedProjectsMap() {
  const map = new Map(); // normalizedKey -> projectObj
  await readHookActiveWorkspace();
  const known = await loadAntigravityProjects();
  for (const p of known) {
    map.set(normalizePathKey(p.rootPath), p);
  }
  const clientRoots = await detectClientRoots();
  for (const cr of clientRoots) {
    const k = normalizePathKey(cr.rootPath);
    if (!map.has(k)) map.set(k, cr);
  }
  for (const [k, rp] of sessionAllowedRoots.entries()) {
    if (!map.has(k)) {
      map.set(k, {
        id: `session:${k}`,
        name: path.basename(rp),
        rootPath: rp,
        uri: localPathToUri(rp),
      });
    }
  }
  return map;
}

async function assertAllowedRoot(rootPath) {
  if (!rootPath || typeof rootPath !== 'string') {
    throw new Error('Missing rootPath');
  }
  const resolved = path.resolve(rootPath);
  const key = normalizePathKey(resolved);
  const allowed = await getAllowedProjectsMap();
  const matched = allowed.get(key);
  if (!matched) {
    throw new Error(`Access denied: "${resolved}" is not a registered Antigravity project.`);
  }
  return matched.rootPath;
}

async function readDirEntries(rootPath, relPath = '', showHidden = true) {
  const resolvedRoot = await assertAllowedRoot(rootPath);
  const targetDir = relPath ? path.resolve(resolvedRoot, relPath) : resolvedRoot;
  if (!isSubPath(resolvedRoot, targetDir)) {
    throw new Error('Access denied: path escapes project root');
  }

  const dirents = await fs.readdir(targetDir, { withFileTypes: true });
  const items = [];

  for (const d of dirents) {
    const isHidden = d.name.startsWith('.');
    if (!showHidden && isHidden) continue;

    const absPath = path.join(targetDir, d.name);
    let isDir = d.isDirectory();
    let size = 0;
    if (d.isSymbolicLink()) {
      try {
        const st = await fs.stat(absPath);
        isDir = st.isDirectory();
        size = st.size;
      } catch {
        continue;
      }
    } else if (!isDir) {
      try {
        const st = await fs.stat(absPath);
        size = st.size;
      } catch {
        size = 0;
      }
    }

    const ext = isDir ? '' : path.extname(d.name).toLowerCase().replace(/^\./, '');
    items.push({
      name: d.name,
      relPath: toPosixRel(resolvedRoot, absPath),
      absPath,
      fileUri: localPathToUri(absPath),
      isDir,
      size,
      ext,
      isHidden,
    });
  }

  items.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  return items;
}

function isWordBoundary(str, idx) {
  if (idx === 0) return true;
  const prev = str[idx - 1];
  const curr = str[idx];
  if (prev === '/' || prev === '\\' || prev === '_' || prev === '-' || prev === '.' || prev === ' ') {
    return true;
  }
  // camelCase boundary: lower -> UPPER
  return prev >= 'a' && prev <= 'z' && curr >= 'A' && curr <= 'Z';
}

function mergeIndicesToRanges(indices) {
  if (!indices.length) return [];
  const ranges = [];
  let start = indices[0];
  let prev = indices[0];
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] === prev + 1) {
      prev = indices[i];
    } else {
      ranges.push([start, prev + 1]);
      start = indices[i];
      prev = indices[i];
    }
  }
  ranges.push([start, prev + 1]);
  return ranges;
}

/**
 * Fuzzy subsequence matcher with boundary & consecutive-run bonuses.
 * Returns { score (lower is better), ranges: [[start, end], ...] } or null.
 */
function fuzzyMatchText(rawPattern, rawText, caseSensitive, maxSpan = Infinity) {
  const pLen = rawPattern.length;
  const tLen = rawText.length;
  if (pLen === 0 || pLen > tLen) return null;

  const pattern = caseSensitive ? rawPattern : rawPattern.toLowerCase();
  const text = caseSensitive ? rawText : rawText.toLowerCase();

  // Fast exact / substring path
  const exactIdx = text.indexOf(pattern);
  if (exactIdx !== -1) {
    let rank = 0;
    if (tLen === pLen) {
      rank = -1000;
    } else if (exactIdx === 0) {
      rank = -600 + (tLen - pLen) * 0.5;
    } else if (isWordBoundary(rawText, exactIdx)) {
      rank = -400 + exactIdx * 0.5 + (tLen - pLen) * 0.3;
    } else {
      rank = -250 + exactIdx + (tLen - pLen) * 0.3;
    }
    return {
      score: rank,
      ranges: [[exactIdx, exactIdx + pLen]],
    };
  }

  // Quick subsequence existence check (forward pass)
  let pi = 0;
  for (let ti = 0; ti < tLen && pi < pLen; ti++) {
    if (text[ti] === pattern[pi]) pi++;
  }
  if (pi < pLen) return null;

  // Greedy boundary-preferring alignment
  const indices = new Array(pLen);
  let searchFrom = 0;
  for (let i = 0; i < pLen; i++) {
    const ch = pattern[i];
    // Find latest possible bound so remaining chars still fit? Keep simple:
    // check if there's a boundary match before forced limit, else first match.
    let firstMatch = -1;
    let boundaryMatch = -1;

    // Calculate max index allowed for position i by scanning backwards on demand only if needed
    for (let j = searchFrom; j <= tLen - (pLen - i); j++) {
      if (text[j] === ch) {
        if (firstMatch === -1) firstMatch = j;
        if (i > 0 && j === indices[i - 1] + 1) {
          // Consecutive char right after previous match is ideal
          boundaryMatch = j;
          break;
        }
        if (isWordBoundary(rawText, j)) {
          // Verify remaining pattern still fits after j
          let rem = i + 1;
          for (let k = j + 1; k < tLen && rem < pLen; k++) {
            if (text[k] === pattern[rem]) rem++;
          }
          if (rem === pLen) {
            boundaryMatch = j;
            break;
          }
        }
      }
    }

    const chosen = boundaryMatch !== -1 ? boundaryMatch : firstMatch;
    if (chosen === -1) return null;
    indices[i] = chosen;
    searchFrom = chosen + 1;
  }

  const span = indices[pLen - 1] - indices[0] + 1;
  if (span > maxSpan) return null;

  let bonus = 0;
  for (let i = 0; i < pLen; i++) {
    const idx = indices[i];
    if (i > 0 && idx === indices[i - 1] + 1) {
      bonus += 18; // consecutive bonus
    }
    if (isWordBoundary(rawText, idx)) {
      bonus += 22; // word/camelCase boundary bonus
    }
    if (rawPattern[i] === rawText[idx]) {
      bonus += 2; // exact case bonus
    }
  }

  const gaps = span - pLen;
  const rank = -bonus + gaps * 6 + indices[0] * 1.5 + (tLen - pLen) * 0.4;
  return {
    score: rank,
    ranges: mergeIndicesToRanges(indices),
  };
}

function buildSearchMatcher(rawQuery, { caseSensitive = false, useRegex = false, fuzzy = true } = {}) {
  const q = useRegex ? rawQuery : rawQuery.trim();
  if (!q) return { matcher: null, regexError: null };

  if (useRegex) {
    let re;
    try {
      re = new RegExp(q, caseSensitive ? '' : 'i');
    } catch (err) {
      return { matcher: null, regexError: err.message || 'Invalid regular expression' };
    }

    const matcher = (name, relPath) => {
      const mName = re.exec(name);
      if (mName && mName[0].length >= 0) {
        const start = mName.index;
        const end = start + mName[0].length;
        const rank = start === 0 && mName[0].length === name.length ? -500 : -200 + start;
        return {
          score: rank,
          nameRanges: end > start ? [[start, end]] : [],
          pathRanges: [],
        };
      }
      const mPath = re.exec(relPath);
      if (mPath && mPath[0].length >= 0) {
        const start = mPath.index;
        const end = start + mPath[0].length;
        return {
          score: 100 + start,
          nameRanges: [],
          pathRanges: end > start ? [[start, end]] : [],
        };
      }
      return null;
    };
    return { matcher, regexError: null };
  }

  if (!fuzzy) {
    const needle = caseSensitive ? q : q.toLowerCase();
    const matcher = (name, relPath) => {
      const hayName = caseSensitive ? name : name.toLowerCase();
      const nIdx = hayName.indexOf(needle);
      if (nIdx !== -1) {
        const rank =
          hayName.length === needle.length
            ? -1000
            : nIdx === 0
              ? -600 + name.length * 0.3
              : -300 + nIdx * 2 + name.length * 0.3;
        return {
          score: rank,
          nameRanges: [[nIdx, nIdx + needle.length]],
          pathRanges: [],
        };
      }
      const hayPath = caseSensitive ? relPath : relPath.toLowerCase();
      const pIdx = hayPath.indexOf(needle);
      if (pIdx !== -1) {
        return {
          score: 80 + pIdx + relPath.length * 0.2,
          nameRanges: [],
          pathRanges: [[pIdx, pIdx + needle.length]],
        };
      }
      return null;
    };
    return { matcher, regexError: null };
  }

  // Fuzzy mode
  const normalizedQ = q.replace(/\\/g, '/');
  const hasSlash = normalizedQ.includes('/');
  const maxPathSpan = Math.max(normalizedQ.length * 4 + 12, 24);

  const matcher = (name, relPath) => {
    if (!hasSlash) {
      const mName = fuzzyMatchText(normalizedQ, name, caseSensitive, Infinity);
      if (mName) {
        return {
          score: mName.score,
          nameRanges: mName.ranges,
          pathRanges: [],
        };
      }
    }
    const mPath = fuzzyMatchText(
      normalizedQ,
      relPath,
      caseSensitive,
      hasSlash ? Infinity : maxPathSpan,
    );
    if (mPath) {
      return {
        score: mPath.score + 120,
        nameRanges: [],
        pathRanges: mPath.ranges,
      };
    }
    return null;
  };
  return { matcher, regexError: null };
}

async function searchSingleProject(resolvedRoot, projectName, matcher, showHidden) {
  if (!matcher) return [];

  const results = [];
  const queue = [resolvedRoot];
  let visited = 0;
  const MAX_VISITED = 30000;

  while (queue.length > 0 && visited < MAX_VISITED) {
    const current = queue.shift();
    let dirents;
    try {
      dirents = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const d of dirents) {
      visited++;
      if (visited > MAX_VISITED) break;

      const isHidden = d.name.startsWith('.');
      if (!showHidden && isHidden) continue;

      // Skip following symlinks during recursive search to avoid cycles
      if (d.isSymbolicLink()) continue;

      const absPath = path.join(current, d.name);
      const isDir = d.isDirectory();
      const relPath = toPosixRel(resolvedRoot, absPath);

      const match = matcher(d.name, relPath);
      if (match) {
        results.push({
          name: d.name,
          relPath,
          absPath,
          rootPath: resolvedRoot,
          projectName,
          fileUri: localPathToUri(absPath),
          isDir,
          isHidden,
          ext: isDir ? '' : path.extname(d.name).toLowerCase().replace(/^\./, ''),
          score: match.score,
          nameRanges: match.nameRanges,
          pathRanges: match.pathRanges,
        });
      }

      if (isDir && !IGNORED_SEARCH_DIRS.has(d.name.toLowerCase()) && !IGNORED_SEARCH_DIRS.has(d.name)) {
        queue.push(absPath);
      }
    }
  }

  return results;
}

async function readFilePreview(rootPath, relPath) {
  const resolvedRoot = await assertAllowedRoot(rootPath);
  const absPath = path.resolve(resolvedRoot, relPath);
  if (!isSubPath(resolvedRoot, absPath)) {
    throw new Error('Access denied: path escapes project root');
  }

  const stat = await fs.stat(absPath);
  if (stat.isDirectory()) {
    throw new Error('Target is a directory');
  }

  const MAX_BYTES = 200 * 1024;
  const fd = await fs.open(absPath, 'r');
  try {
    const len = Math.min(stat.size, MAX_BYTES);
    const buf = Buffer.alloc(len);
    await fd.read(buf, 0, len, 0);

    const sampleLen = Math.min(len, 4096);
    let isBinary = false;
    for (let i = 0; i < sampleLen; i++) {
      if (buf[i] === 0) {
        isBinary = true;
        break;
      }
    }

    const name = path.basename(absPath);
    const ext = path.extname(name).toLowerCase().replace(/^\./, '');
    const normalizedRel = toPosixRel(resolvedRoot, absPath);

    await addRecentFile({
      name,
      relPath: normalizedRel,
      absPath,
      rootPath: resolvedRoot,
      fileUri: localPathToUri(absPath),
      ext,
    });

    if (isBinary) {
      return {
        name,
        relPath: normalizedRel,
        absPath,
        fileUri: localPathToUri(absPath),
        size: stat.size,
        isBinary: true,
        truncated: false,
        content: '',
      };
    }

    return {
      name,
      relPath: normalizedRel,
      absPath,
      fileUri: localPathToUri(absPath),
      size: stat.size,
      isBinary: false,
      truncated: stat.size > MAX_BYTES,
      content: buf.toString('utf8'),
    };
  } finally {
    await fd.close();
  }
}

function extractWorkspaceFromMeta(extra) {
  const meta = extra?._meta;
  if (!meta || typeof meta !== 'object') return null;
  const candidates = [
    meta.workspaceUri,
    meta.rootUri,
    meta.cwd,
    Array.isArray(meta.workspaceUris) ? meta.workspaceUris[0] : null,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      const p = uriToLocalPath(c);
      if (p) return p;
    }
  }
  return null;
}

async function resolveContext(explicitRootPath, extra) {
  const [knownProjects, clientRoots, hookActive, state] = await Promise.all([
    loadAntigravityProjects(),
    detectClientRoots(),
    readHookActiveWorkspace(),
    readState(),
  ]);

  const projects = [...knownProjects];
  const keySet = new Set(projects.map((p) => normalizePathKey(p.rootPath)));

  for (const cr of clientRoots) {
    const k = normalizePathKey(cr.rootPath);
    if (!keySet.has(k)) {
      projects.unshift(cr);
      keySet.add(k);
    }
  }

  for (const [k, rp] of sessionAllowedRoots.entries()) {
    if (!keySet.has(k) && fsSync.existsSync(rp)) {
      projects.unshift({
        id: `session:${k}`,
        name: path.basename(rp),
        rootPath: rp,
        uri: localPathToUri(rp),
      });
      keySet.add(k);
    }
  }

  let activeProject = null;
  let detectedBy = 'all';
  let signalTime = 0;

  // 1. Explicit tool argument or MCP request _meta
  const candidateExplicit = explicitRootPath || extractWorkspaceFromMeta(extra);
  if (candidateExplicit) {
    const localCandidate = uriToLocalPath(candidateExplicit) || candidateExplicit;
    const resolved = path.resolve(localCandidate);
    try {
      const st = await fs.stat(resolved);
      if (st.isDirectory()) {
        const key = normalizePathKey(resolved);
        sessionAllowedRoots.set(key, resolved);
        activeProject = projects.find((p) => normalizePathKey(p.rootPath) === key) || {
          id: `explicit:${key}`,
          name: path.basename(resolved),
          rootPath: resolved,
          uri: localPathToUri(resolved),
        };
        if (!keySet.has(key)) {
          projects.unshift(activeProject);
          keySet.add(key);
        }
        detectedBy = explicitRootPath ? 'arg' : 'roots';
        signalTime = Date.now();
        await updateState((prev) => ({ ...prev, lastRootPath: resolved }));
      }
    } catch {
      // ignore non-existent explicit path
    }
  }

  // 2. MCP client roots/list
  if (!activeProject && clientRoots.length > 0) {
    const key = normalizePathKey(clientRoots[0].rootPath);
    activeProject = projects.find((p) => normalizePathKey(p.rootPath) === key) || clientRoots[0];
    detectedBy = 'roots';
    signalTime = Date.now();
  }

  // 3. Compare live conversation hook vs most recently touched Project in Antigravity sidebar
  if (!activeProject) {
    let hookProj = null;
    let hookTime = 0;
    if (hookActive?.rootPath) {
      const hk = normalizePathKey(hookActive.rootPath);
      hookProj =
        projects.find((p) => normalizePathKey(p.rootPath) === hk) ||
        projects.find((p) => isSubPath(p.rootPath, hookActive.rootPath)) || {
          id: `chat:${hk}`,
          name: path.basename(hookActive.rootPath),
          rootPath: hookActive.rootPath,
          uri: localPathToUri(hookActive.rootPath),
        };
      hookTime = hookActive.updatedAt || 0;
    }

    let recentSidebarProj = null;
    let recentSidebarTime = 0;
    for (const p of knownProjects) {
      if ((p.lastSelectedAt || 0) > recentSidebarTime) {
        recentSidebarTime = p.lastSelectedAt || 0;
        recentSidebarProj = p;
      }
    }

    if (hookProj && hookTime >= recentSidebarTime) {
      activeProject = hookProj;
      detectedBy = 'active-chat';
      signalTime = hookTime;
    } else if (recentSidebarProj) {
      activeProject = recentSidebarProj;
      detectedBy = 'selected-project';
      signalTime = recentSidebarTime;
    }
  }

  // 4. Fallback to server process.cwd() if inside a registered project
  if (!activeProject) {
    const cwd = path.resolve(process.cwd());
    const cwdKey = normalizePathKey(cwd);
    const matched = projects.find(
      (p) => cwdKey === normalizePathKey(p.rootPath) || isSubPath(p.rootPath, cwd),
    );
    if (matched) {
      activeProject = matched;
      detectedBy = 'cwd';
    }
  }

  // 5. Fallback to user's last manually selected project
  if (!activeProject && state.lastRootPath) {
    const lastKey = normalizePathKey(state.lastRootPath);
    const matched = projects.find((p) => normalizePathKey(p.rootPath) === lastKey);
    if (matched) {
      activeProject = matched;
      detectedBy = 'manual';
    }
  }

  // Default to 'single' whenever an active project is identified so tree & search target it directly
  const viewMode = activeProject ? 'single' : 'all';

  return {
    projects,
    activeProject,
    viewMode,
    detectedBy,
    signalTime,
    recents: Array.isArray(state.recents) ? state.recents : [],
  };
}

// 1. UI Resource (request clipboardWrite permission for sandboxed iframe)
mcp.registerResource(
  'Workspace Explorer UI',
  APP_URI,
  {
    mimeType: 'text/html;profile=mcp-app',
    description: 'Interactive project file tree explorer for Antigravity',
    _meta: {
      ui: {
        prefersBorder: false,
        permissions: {
          clipboardWrite: {},
        },
      },
    },
  },
  async () => {
    const html = await fs.readFile(APP_HTML_PATH, 'utf8');
    return {
      contents: [
        {
          uri: APP_URI,
          mimeType: 'text/html;profile=mcp-app',
          text: html,
        },
      ],
    };
  },
);

// 2. Entrypoint Tool (visible to both model and UI entrypoints)
mcp.registerTool(
  'open_explorer',
  {
    title: 'Workspace Explorer',
    description:
      'Open the Workspace Explorer side pane to browse the folder tree of the current project or all Antigravity projects. Pass the current active workspace directory in rootPath when known.',
    inputSchema: {
      rootPath: z
        .string()
        .optional()
        .describe('Optional absolute path to the current active workspace root folder.'),
    },
    _meta: {
      ui: {
        resourceUri: APP_URI,
      },
      'com.google.antigravity/ui': {
        entrypoints: [
          { type: 'aux_pane', title: 'Workspace Explorer' },
          { type: 'global', title: 'Workspace Explorer' },
        ],
      },
    },
  },
  async (args, extra) => {
    const ctx = await resolveContext(args?.rootPath, extra);
    let entries = [];
    if (ctx.activeProject) {
      try {
        entries = await readDirEntries(ctx.activeProject.rootPath, '', true);
      } catch {
        entries = [];
      }
    }

    const summary =
      ctx.viewMode === 'single' && ctx.activeProject
        ? `Opened Workspace Explorer for ${ctx.activeProject.name} (${ctx.activeProject.rootPath}) with ${entries.length} top-level items.`
        : `Opened Workspace Explorer listing ${ctx.projects.length} Antigravity projects.`;

    return {
      content: [{ type: 'text', text: summary }],
      structuredContent: {
        ...ctx,
        entries,
      },
    };
  },
);

// 3. App-only tools (hidden from model)
const APP_ONLY_META = {
  ui: {
    visibility: ['app'],
  },
};

mcp.registerTool(
  'list_projects',
  {
    title: 'List Projects',
    description: 'Return all known Antigravity projects and current active context.',
    inputSchema: {},
    _meta: APP_ONLY_META,
  },
  async (_args, extra) => {
    const ctx = await resolveContext(undefined, extra);
    return {
      content: [{ type: 'text', text: `Found ${ctx.projects.length} projects.` }],
      structuredContent: ctx,
    };
  },
);

mcp.registerTool(
  'check_active_workspace',
  {
    title: 'Check Active Workspace',
    description: 'Lightweight check for active conversation or selected project changes.',
    inputSchema: {},
    _meta: APP_ONLY_META,
  },
  async (_args, extra) => {
    const ctx = await resolveContext(undefined, extra);
    return {
      content: [{ type: 'text', text: ctx.activeProject?.name || 'none' }],
      structuredContent: {
        activeProject: ctx.activeProject,
        detectedBy: ctx.detectedBy,
        signalTime: ctx.signalTime || 0,
        projects: ctx.projects,
      },
    };
  },
);

mcp.registerTool(
  'list_dir',
  {
    title: 'List Directory',
    description: 'List immediate children of a directory inside an allowed project.',
    inputSchema: {
      rootPath: z.string(),
      relPath: z.string().optional(),
      showHidden: z.boolean().optional(),
    },
    _meta: APP_ONLY_META,
  },
  async ({ rootPath, relPath = '', showHidden = true }) => {
    const entries = await readDirEntries(rootPath, relPath, showHidden);
    return {
      content: [{ type: 'text', text: `${entries.length} entries` }],
      structuredContent: {
        rootPath: path.resolve(rootPath),
        relPath,
        entries,
      },
    };
  },
);

mcp.registerTool(
  'search_files',
  {
    title: 'Search Files',
    description: 'Recursively search files and folders inside one project or across all projects.',
    inputSchema: {
      rootPath: z.string().optional(),
      query: z.string(),
      caseSensitive: z.boolean().optional(),
      useRegex: z.boolean().optional(),
      fuzzy: z.boolean().optional(),
      showHidden: z.boolean().optional(),
      maxResults: z.number().int().min(1).max(300).optional(),
    },
    _meta: APP_ONLY_META,
  },
  async ({
    rootPath,
    query,
    caseSensitive = false,
    useRegex = false,
    fuzzy = true,
    showHidden = true,
    maxResults = 150,
  }) => {
    const { matcher, regexError } = buildSearchMatcher(query, {
      caseSensitive,
      useRegex,
      fuzzy,
    });

    if (regexError) {
      return {
        content: [{ type: 'text', text: `Invalid regex: ${regexError}` }],
        structuredContent: {
          query,
          regexError,
          results: [],
        },
      };
    }

    if (!matcher) {
      return {
        content: [{ type: 'text', text: 'Found 0 matches' }],
        structuredContent: {
          query,
          results: [],
        },
      };
    }

    let merged = [];
    if (rootPath) {
      const resolvedRoot = await assertAllowedRoot(rootPath);
      const allowed = await getAllowedProjectsMap();
      const proj = allowed.get(normalizePathKey(resolvedRoot));
      merged = await searchSingleProject(
        resolvedRoot,
        proj?.name || path.basename(resolvedRoot),
        matcher,
        showHidden,
      );
    } else {
      const allowed = await getAllowedProjectsMap();
      const projects = [...allowed.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
      for (const p of projects) {
        const items = await searchSingleProject(p.rootPath, p.name, matcher, showHidden);
        merged.push(...items);
      }
    }

    merged.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.relPath.localeCompare(b.relPath, undefined, { numeric: true, sensitivity: 'base' });
    });

    const results = merged.slice(0, maxResults);
    return {
      content: [{ type: 'text', text: `Found ${results.length} matches` }],
      structuredContent: {
        query,
        results,
      },
    };
  },
);

mcp.registerTool(
  'read_file_preview',
  {
    title: 'Read File Preview',
    description: 'Read a text file preview inside an allowed project.',
    inputSchema: {
      rootPath: z.string(),
      relPath: z.string(),
    },
    _meta: APP_ONLY_META,
  },
  async ({ rootPath, relPath }) => {
    const preview = await readFilePreview(rootPath, relPath);
    return {
      content: [{ type: 'text', text: preview.name }],
      structuredContent: preview,
    };
  },
);

mcp.registerTool(
  'set_active_project',
  {
    title: 'Set Active Project',
    description: 'Remember the selected project root path.',
    inputSchema: {
      rootPath: z.string(),
    },
    _meta: APP_ONLY_META,
  },
  async ({ rootPath }) => {
    const resolved = await assertAllowedRoot(rootPath);
    await updateState((prev) => ({ ...prev, lastRootPath: resolved }));
    return {
      content: [{ type: 'text', text: resolved }],
      structuredContent: { lastRootPath: resolved },
    };
  },
);

(async () => {
  const transport = new StdioServerTransport();
  await mcp.connect(transport);
})();
