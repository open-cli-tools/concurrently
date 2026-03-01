import { exec as originalExec } from 'node:child_process';
import util from 'node:util';

import { expect, it } from 'vitest';

const exec = util.promisify(originalExec);

it.each(['cjs-import', 'cjs-require', 'esm'])('loads library in %s context', async (project) => {
    // Use as separate execs as tsc outputs to stdout, instead of stderr, and so its text isn't shown
    await exec(`tsc -p ${project}`, { cwd: __dirname }).catch((err) => Promise.reject(err.stdout));
    await expect(
        exec(`node ${project}/dist/smoke-test.js`, { cwd: __dirname }),
    ).resolves.toBeDefined();
});
