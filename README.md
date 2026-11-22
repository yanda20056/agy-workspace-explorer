# Workspace Explorer

**[简体中文](#简体中文) | [English](#english)**

---

<a id="简体中文"></a>

## 简体中文

专为 **Google Antigravity** 打造的轻量级**本地工程文件目录树 & 多工程浏览** UI 插件（MCP App）。弥补 Antigravity App 右侧辅助面板缺少完整工作区文件目录树的痛点。

### 一键安装

环境要求：本机 `PATH` 中已安装 **Node.js >= 20**（仓库 `dist/` 目录已内置零依赖打包产物，安装后无需执行 `npm install`，开箱即用）。

```bash
agy plugin install https://github.com/yanda20056/agy-workspace-explorer
```

### 核心功能

- **自动定位当前对话 / 当前选中工程**：
  - 内置轻量生命周期 Hook（`SessionStart` / `PreInvocation`）与 `~/.gemini/config/projects/` 活跃时间检测，打开面板时自动聚焦**当前正在对话或刚选中的工程**。
  - 面板常驻打开时，在主界面切换工程或切换到其他工程对话框发消息，目录树会自动跟随切换；同时支持顶部一键切换查看**全部已注册工程**。
- **右侧辅助面板 & 左侧全屏双入口**：
  - 在对话界面右侧辅助面板点击 **`+` -> `Workspace Explorer`** 作为常驻侧边栏标签页打开；也可从左侧边栏全屏打开。
- **点击打开原生文件标签页 & 内置代码预览**：
  - 点击任意文件优先调用 Antigravity 原生侧边栏文件查看器（`com.google.antigravity/toggle-aux-pane`）打开；在无侧边栏的全屏模式（或点击行内预览图标）下，自动开启可拖拽高度、带行号的内置文本预览面板。
- **增强型搜索（模糊 / 正则 / 大小写）**：
  - 默认限定在当前工程内极速递归搜索（切换至“全部工程”视图时可跨所有工程搜索），自动跳过 `node_modules`、`.git`、`library`、`temp` 等缓存目录。
  - 搜索框内置三个模式开关：
    - `~` **模糊查找（Fuzzy Match，默认开启）**：支持非连续子序列、驼峰首字母与路径片段匹配并智能排序；关闭后切换为精确连续子串匹配。
    - `Aa` **区分大小写（Match Case）**：对模糊、子串、正则三种模式均生效。
    - `.*` **正则表达式（Regular Expression）**：支持完整正则匹配文件名或相对路径，语法错误实时友好提示。
  - 搜索结果支持命中字符高亮，以及一键在目录树中逐级展开并滚动定位（瞄准镜图标）。
- **快捷路径操作 & 右键菜单**：
  - 悬停或右键点击任意文件/文件夹，支持**在系统文件窗口中打开并高亮选中**（Windows Explorer / macOS Finder）、一键**复制相对路径**（`./`）、**复制绝对路径**、**复制文件名**，或直接将路径附加到当前对话上下文。
- **中英文双语切换（默认英文）**：
  - 工程下拉菜单右侧内置 **`EN` / `中`** 语言切换按钮，默认显示英文界面，支持一键切换中英文并自动记住语言偏好。

### 本地二次开发

```bash
npm install
npm run build
agy plugin validate --strict .
```

---

<a id="english"></a>

## English

A lightweight project file tree & multi-project browser MCP App plugin for **Google Antigravity**.

### Quick Install

Requires **Node.js >= 20** on your `PATH`. No `npm install` needed — prebuilt zero-dependency bundles are included in `dist/`.

```bash
agy plugin install https://github.com/yanda20056/agy-workspace-explorer
```

### Features

- **Auto-Follow Active Conversation & Selected Project**: Automatically detects and focuses the project of your active conversation (via lifecycle hooks) or most recently selected Antigravity project (`~/.gemini/config/projects/`), with a one-click toggle to browse all registered projects.
- **Side Pane & Full-Page Entrypoints**: Open directly from the auxiliary side pane (`+` -> **Workspace Explorer**) or from the left sidebar (**Workspace Explorer**).
- **Native File Opening & Built-in Preview**: Click any file to open it in Antigravity's native side-pane file viewer (`com.google.antigravity/toggle-aux-pane`), with automatic fallback to a resizable line-numbered preview drawer.
- **Fuzzy, Regex & Case-Sensitive Search**: Fast recursive search scoped to the current project (or across all projects) supporting fuzzy subsequence matching (`~`), case sensitivity (`Aa`), regular expressions (`.*`), match highlighting, and one-click reveal in tree.
- **Quick Path Actions & OS Reveal**: Reveal any file or folder directly in your system file manager (Windows Explorer / macOS Finder), copy relative path, copy full path, copy file name, or attach selected paths directly to your conversation context.
- **Bilingual UI (`EN` / `中`, English by default)**: One-click language toggle button next to the project dropdown to switch between English and Chinese at any time, with persistent preference.

### Local Development

```bash
npm install
npm run build
agy plugin validate --strict .
```

## License

MIT
