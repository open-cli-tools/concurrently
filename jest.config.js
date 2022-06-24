/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
    transform: {
        '^.+\\.(t|j)sx?$': ['@swc/jest'],
    },
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/dist'],
};

module.exports = config;
