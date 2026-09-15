'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('esbuild');

const root = path.resolve(__dirname, '..');

/** Load actual TypeScript with small dependency seams; no production database or app startup. */
function createLoader(mocks = {}, globals = {}) {
  const cache = new Map();
  function resolveFile(file) {
    for (const candidate of [file, `${file}.ts`, path.join(file, 'index.ts')]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
    throw new Error(`Module not found: ${file}`);
  }
  function load(file) {
    const filename = resolveFile(path.resolve(root, file));
    const key = path.relative(root, filename).replaceAll('\\', '/');
    if (Object.hasOwn(mocks, key)) return mocks[key];
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = transformSync(fs.readFileSync(filename, 'utf8'), { loader: 'ts', format: 'cjs', target: 'node20' }).code;
    const context = vm.createContext({
      module, exports: module.exports, __dirname: path.dirname(filename),
      console: { log() {}, warn() {}, error() {} }, setInterval, clearInterval, Date,
      require: (name) => Object.hasOwn(mocks, name) ? mocks[name]
        : name.startsWith('.') ? load(path.resolve(path.dirname(filename), name)) : require(name),
      ...globals,
    });
    vm.runInContext(code, context, { filename });
    return module.exports;
  }
  return load;
}
module.exports = { root, createLoader };
