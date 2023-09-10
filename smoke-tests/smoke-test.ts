/* eslint-disable no-console */

import assert from 'node:assert';

(async () => {
    try {
        const { default: esm } = await import('../index.mjs');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { default: cjs } = require('../index.js');

        // Assert the functions loaded by checking their names load and types are correct
        assert.strictEqual(typeof esm === 'function', true, 'Expected esm default to be function');
        assert.strictEqual(typeof cjs === 'function', true, 'Expected cjs default to be function');

        console.info('Imported with both CJS and ESM successfully');
    } catch (error) {
        console.error(error);
        console.debug(error.stack);

        // Prevent an unhandled rejection, exit gracefully.
        process.exit(1);
    }
})();
