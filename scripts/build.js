// @ts-check
'use strict';

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const mainConfig = {
  entryPoints: [path.join(__dirname, '../src/main/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: path.join(__dirname, '../dist/main/index.js'),
  external: ['electron', 'better-sqlite3'],
  sourcemap: true,
  tsconfig: path.join(__dirname, '../tsconfig.json'),
};

/** @type {import('esbuild').BuildOptions} */
const preloadConfig = {
  entryPoints: [path.join(__dirname, '../src/preload/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: path.join(__dirname, '../dist/preload/index.js'),
  external: ['electron'],
  sourcemap: true,
  tsconfig: path.join(__dirname, '../tsconfig.json'),
};

/** @type {import('esbuild').BuildOptions} */
const audioWindowPreloadConfig = {
  entryPoints: [path.join(__dirname, '../src/preload/audio-window.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: path.join(__dirname, '../dist/preload/audio-window.js'),
  external: ['electron'],
  sourcemap: true,
  tsconfig: path.join(__dirname, '../tsconfig.json'),
};

/** @type {import('esbuild').BuildOptions} */
const rendererConfig = {
  entryPoints: [path.join(__dirname, '../src/renderer/main.ts')],
  bundle: true,
  platform: 'browser',
  target: 'chrome132',
  format: 'iife',
  outfile: path.join(__dirname, '../dist/renderer/main.js'),
  sourcemap: true,
  tsconfig: path.join(__dirname, '../tsconfig.renderer.json'),
};

/**
 * Copy SQL migration files to dist/main/database/migrations/
 * Esbuild bundles TypeScript but cannot embed SQL files, so we copy them manually.
 */
function copyMigrations() {
  const srcDir = path.join(__dirname, '../src/main/database/migrations');
  const outDir = path.join(__dirname, '../dist/main/migrations');

  if (!fs.existsSync(srcDir)) return;

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const sqlFiles = fs.readdirSync(srcDir).filter((f) => f.endsWith('.sql'));
  for (const file of sqlFiles) {
    fs.copyFileSync(path.join(srcDir, file), path.join(outDir, file));
  }
}

/**
 * Recursively copy a directory.
 * @param {string} src
 * @param {string} dest
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Copy static renderer assets (HTML, CSS, fonts) to dist/renderer/
 */
function copyRendererAssets() {
  const srcDir = path.join(__dirname, '../src/renderer');
  const outDir = path.join(__dirname, '../dist/renderer');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const staticFiles = ['index.html', 'audio.html', 'styles/main.css'];
  for (const file of staticFiles) {
    const srcFile = path.join(srcDir, file);
    const outFile = path.join(outDir, file);

    if (fs.existsSync(srcFile)) {
      const outSubDir = path.dirname(outFile);
      if (!fs.existsSync(outSubDir)) {
        fs.mkdirSync(outSubDir, { recursive: true });
      }
      fs.copyFileSync(srcFile, outFile);
    }
  }

  // Copy self-hosted fonts
  copyDir(path.join(srcDir, 'fonts'), path.join(outDir, 'fonts'));
}

async function build() {
  if (isWatch) {
    const mainCtx = await esbuild.context(mainConfig);
    const preloadCtx = await esbuild.context(preloadConfig);
    const audioWindowPreloadCtx = await esbuild.context(audioWindowPreloadConfig);
    const rendererCtx = await esbuild.context(rendererConfig);

    await Promise.all([
      mainCtx.watch(),
      preloadCtx.watch(),
      audioWindowPreloadCtx.watch(),
      rendererCtx.watch(),
    ]);

    copyMigrations();
    copyRendererAssets();
    console.log('[build] watching for changes...');
  } else {
    await Promise.all([
      esbuild.build(mainConfig),
      esbuild.build(preloadConfig),
      esbuild.build(audioWindowPreloadConfig),
      esbuild.build(rendererConfig),
    ]);

    copyMigrations();
    copyRendererAssets();
    console.log('[build] done');
  }
}

build().catch((err) => {
  console.error('[build] failed:', err);
  process.exit(1);
});
