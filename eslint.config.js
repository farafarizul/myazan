// @ts-check
'use strict';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tseslint = require('@typescript-eslint/eslint-plugin');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tsparser = require('@typescript-eslint/parser');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: ['./tsconfig.json', './tsconfig.renderer.json'],
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'no-console': 'off',
    },
  },
  {
    ignores: ['dist/**', 'dist-build/**', 'node_modules/**', 'scripts/**'],
  },
];
