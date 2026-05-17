import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            include: ['lib/**/*.ts', '!lib/index.ts'],
            // lcov is used for coveralls
            reporter: ['text', 'html', 'lcov'],
        },
        globalSetup: 'tests/setup.ts',
        projects: [
            {
                test: {
                    name: 'unit',
                    include: ['lib/**/*.spec.ts'],
                },
            },
            {
                test: {
                    name: 'e2e',
                    include: ['tests/e2e/*.spec.ts'],
                },
            },
            {
                test: {
                    name: 'smoke',
                    include: ['tests/smoke/*.spec.ts'],
                },
            },
        ],
    },
});
