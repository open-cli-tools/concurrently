import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            enabled: true,
            include: ['src/**/*.ts', '!src/index.ts'],
            // lcov is used for coveralls
            reporter: ['text', 'html', 'lcov'],
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
