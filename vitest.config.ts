import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            include: ['lib/**/*.ts', '!lib/index.ts'],
            // lcov is used for coveralls
            reporter: ['text', 'html', 'lcov'],
        },
        projects: [
            {
                extends: true,
                test: {
                    name: 'unit',
                    include: ['{bin,lib}/**/*.spec.ts'],
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
