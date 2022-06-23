/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
    transform: {
        '^.+\\.(t|j)sx?$': ['@swc/jest'],
    },
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
    coveragePathIgnorePatterns: ['/fixtures/', '/node_modules/'],
    testPathIgnorePatterns: ['/node_modules/', '/dist'],
};

module.exports = config;
