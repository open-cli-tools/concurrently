/*
 * While in local development, make sure you've run `pnpm run build` first.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const concurrently = require('./dist/src/index.js');

module.exports = exports = concurrently.concurrently;
Object.assign(exports, concurrently);
