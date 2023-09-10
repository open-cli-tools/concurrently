// @ts-check
/* eslint-disable no-console */

import assert from 'node:assert';

import concurrently from '../index.mjs';

(async () => {
    try {
        // Assert the functions loaded by checking their names load and types are correct
        assert.strictEqual(
            typeof concurrently === 'function',
            true,
            'Expected default to be function',
        );

        console.info('Imported esm successfully');
    } catch (error) {
        console.error(error);
        console.debug(error.stack);

        // Prevent an unhandled rejection, exit gracefully.
        process.exit(1);
    }
})();
