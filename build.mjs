import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Bundle browser UI into a single self-contained dist/app.html
const uiResult = await esbuild.build({
  entryPoints: [path.join(__dirname, 'src', 'app.js')],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: ['es2022'],
  minify: true,
  write: false,
});

const jsCode = uiResult.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const template = await fs.readFile(path.join(__dirname, 'src', 'template.html'), 'utf8');
const html = template.replace('<!--__BUNDLE_SCRIPT__-->', () => `<script>${jsCode}</script>`);

const match = html.match(/<script>([\s\S]*)<\/script>/);
if (!match) {
  throw new Error('Failed to inject <script> into HTML');
}
new vm.Script(match[1]);

await fs.mkdir(path.join(__dirname, 'dist'), { recursive: true });
await fs.writeFile(path.join(__dirname, 'dist', 'app.html'), html, 'utf8');

// 2. Bundle MCP server into a zero-dependency dist/server.cjs so end users don't need npm install
await esbuild.build({
  entryPoints: [path.join(__dirname, 'server.mjs')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: ['node20'],
  minify: true,
  outfile: path.join(__dirname, 'dist', 'server.cjs'),
});

console.log(
  `Built dist/app.html (${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)} KB) & dist/server.cjs`,
);
