// @ts-check
/* eslint-disable @typescript-eslint/no-var-requires, no-console */

const assert = require('node:assert');
const concurrently = require('../index.js');

// Assert the functions loaded by checking their names load and types are correct
assert.strictEqual(
  typeof concurrently === 'function',
  true,
  'Expected default to be function',
);

console.info('Imported cjs successfully');
