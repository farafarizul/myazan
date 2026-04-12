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
  external: ['electron'],
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
 * Copy static renderer assets (HTML, CSS) to dist/renderer/
 */
function copyRendererAssets() {
  const srcDir = path.join(__dirname, '../src/renderer');
  const outDir = path.join(__dirname, '../dist/renderer');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const staticFiles = ['index.html', 'styles/main.css'];
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
}

async function build() {
  if (isWatch) {
    const mainCtx = await esbuild.context(mainConfig);
    const preloadCtx = await esbuild.context(preloadConfig);
    const rendererCtx = await esbuild.context(rendererConfig);

    await Promise.all([
      mainCtx.watch(),
      preloadCtx.watch(),
      rendererCtx.watch(),
    ]);

    copyRendererAssets();
    console.log('[build] watching for changes...');
  } else {
    await Promise.all([
      esbuild.build(mainConfig),
      esbuild.build(preloadConfig),
      esbuild.build(rendererConfig),
    ]);

    copyRendererAssets();
    console.log('[build] done');
  }
}

build().catch((err) => {
  console.error('[build] failed:', err);
  process.exit(1);
});
