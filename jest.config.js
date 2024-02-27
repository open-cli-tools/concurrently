// Need to extend from a base config because projects don't inherit configurations as documented
// https://github.com/jestjs/jest/issues/11411
/** @type {import('@jest/types').Config.InitialProjectOptions} */
const baseConfig = {
    transform: {
        '.*': ['@swc/jest'],
    },
    testPathIgnorePatterns: ['/node_modules/', '/dist'],
};

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
    collectCoverage: true,
    projects: [
        {
            ...baseConfig,
            displayName: 'unit',
            collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
            // (src|bin) doesn't seem to work on Windows
            testMatch: ['src', 'bin'].map((dir) => `<rootDir>/${dir}/**/*.spec.ts`),
        },
        {
            ...baseConfig,
            displayName: 'smoke',
            testMatch: ['<rootDir>/tests/**/*.spec.ts'],
        },
    ],
};

module.exports = config;
