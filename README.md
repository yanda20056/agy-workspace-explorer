# Workspace Explorer

A lightweight project file tree & multi-project browser MCP App plugin for **Google Antigravity**.

## Quick Install

Requires **Node.js >= 20** on your `PATH`. No `npm install` needed — prebuilt bundles are included in `dist/`.

```bash
agy plugin install https://github.com/yanda20056/agy-workspace-explorer
```

## Features

- **Auto-Follow Active Conversation & Selected Project**: Automatically detects and opens the project of your active conversation (via lifecycle hooks) or most recently selected Antigravity project (`~/.gemini/config/projects/`), with a one-click toggle to view all registered projects.
- **Side Pane & Full-Page Entrypoints**: Open directly from the auxiliary side pane (`+` -> **Workspace Explorer**) or from the left sidebar (**Workspace Explorer**).
- **Native File Opening & Built-in Preview**: Click any file to open it in Antigravity's native side-pane file viewer (`com.google.antigravity/toggle-aux-pane`), with automatic fallback to a resizable line-numbered preview drawer.
- **Fuzzy, Regex & Case-Sensitive Search**: Fast recursive search scoped to the current project (or across all projects) supporting fuzzy subsequence matching (`~`), case sensitivity (`Aa`), regular expressions (`.*`), match highlighting, and one-click reveal in tree.
- **Quick Path Actions**: Copy relative path, copy full path, copy file name, or attach selected paths directly to your conversation context.

## Local Development

```bash
npm install
npm run build
agy plugin validate --strict .
```

## License

MIT
