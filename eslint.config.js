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
            ecmaVersion: 2023,
        },
    },
    eslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        files: ['**/*.js', '**/*.spec.ts', '**/__fixtures__/**/*', 'tests/**/*'],
        extends: [tseslint.configs.disableTypeChecked],
    },
    {
        rules: {
            curly: 'error',
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            'no-var': 'error',
            'no-console': 'error',
            'prefer-const': 'error',
            'prefer-object-spread': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/prefer-promise-reject-errors': 'off',
        },
    },
    {
        files: ['**/*.ts'],
        ignores: ['**/*.spec.ts', '**/__fixtures__/**/*', 'tests/**/*'],
        rules: {
            '@typescript-eslint/consistent-type-imports': 'error',
            '@typescript-eslint/no-import-type-side-effects': 'error',
            '@typescript-eslint/consistent-type-exports': [
                'error',
                { fixMixedExportsWithInlineTypeSpecifier: true },
            ],
        },
    },
    { files: ['**/__fixtures__/**/*.{js,ts}'], rules: { 'no-console': 'off' } },
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
            'import/no-duplicates': ['error', { 'prefer-inline': true }],
        },
    },
    {
        files: ['**/*.spec.ts'],
        plugins: {
            vitest: pluginVitest,
        },
        rules: {
            ...pluginVitest.configs.recommended.rules,
            // Currently produces false positives, see https://github.com/vitest-dev/eslint-plugin-vitest/issues/775
            'vitest/prefer-called-exactly-once-with': 'off',
        },
    },
    pluginPrettierRecommended,
);
