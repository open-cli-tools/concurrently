import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
    transform: {
        '^.+\\.(t|j)sx?$': ['@swc/jest'],
    },
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        // See https://github.com/facebook/jest/issues/12270#issuecomment-1111533936
        chalk: require.resolve('chalk'),
        '#ansi-styles': path.join(
            require.resolve('chalk').split('chalk')[0],
            'chalk/source/vendor/ansi-styles/index.js'
        ),
        '#supports-color': path.join(
            require.resolve('chalk').split('chalk')[0],
            'chalk/source/vendor/supports-color/index.js'
        ),
    },
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/dist'],
};

export default config;
