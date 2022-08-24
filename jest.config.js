/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
    transform: {
        '^.+\\.(t|j)sx?$': ['@swc/jest'],
    },
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/dist'],
};

export default config;
