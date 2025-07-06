import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            enabled: true,
            include: ['src/**/*.ts', '!src/index.ts'],
        },
        projects: [
            {
                extends: true,
                test: {
                    name: 'unit',
                    include: ['src/**/*.spec.ts'],
                },
            },
            {
                extends: true,
                test: {
                    name: 'smoke',
                    include: ['tests/**/*.spec.ts'],
                },
            },
        ],
    },
});
