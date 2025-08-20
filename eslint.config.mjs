// @ts-check

import eslint from '@eslint/js';
import pluginVitest from '@vitest/eslint-plugin';
import { defineConfig } from 'eslint/config';
import gitignore from 'eslint-config-flat-gitignore';
import pluginImportLite from 'eslint-plugin-import-lite';
import pluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import pluginSimpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
    gitignore(),
    {
        languageOptions: {
            globals: {
                ...globals.node,
            },
            ecmaVersion: 2022,
            sourceType: 'commonjs',
        },
    },
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        rules: {
            curly: 'error',
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            'no-var': 'error',
            'no-console': 'error',
            'prefer-const': 'error',
            'prefer-object-spread': 'error',
        },
    },
    {
        plugins: {
            'simple-import-sort': pluginSimpleImportSort,
            import: pluginImportLite,
        },
        rules: {
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
            'import/first': 'error',
            'import/newline-after-import': 'error',
            'import/no-duplicates': 'error',
        },
    },
    {
        files: ['**/*.spec.ts'],
        ...pluginVitest.configs.recommended,
    },
    pluginPrettierRecommended,
);
