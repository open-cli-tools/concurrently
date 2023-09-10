/*
 * While in local development, make sure you've run `pnpm run build` first.
 */

import concurrently from './dist/src/index.js';

// NOTE: the star reexport doesn't work in Node <12.20, <14.13 and <15.
export * from './dist/src/index.js';

// In some cases, like with Bun, `default` is undefined and the function itself is
// safely accessible via `concurrently`.
export default concurrently.default || concurrently;
