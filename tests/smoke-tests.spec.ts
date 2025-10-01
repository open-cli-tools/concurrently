import { exec as originalExec } from 'node:child_process';
import util from 'node:util';

import { beforeAll, expect, test } from 'vitest';

const exec = util.promisify(originalExec);

beforeAll(async () => {
    await exec('pnpm run build');
}, 20_000);

test('spawn binary', async () => {
    await expect(exec('pnpm exec dist/bin/concurrently.js "echo test"')).resolves.toBeDefined();
});

test.each(['cjs-import', 'cjs-require', 'esm'])('load library in %s context', async (project) => {
    // Use as separate execs as tsc outputs to stdout, instead of stderr, and so its text isn't shown
    await exec(`tsc -p ${project}`, { cwd: __dirname }).catch((err) => Promise.reject(err.stdout));
    await expect(
        exec(`node ${project}/dist/smoke-test.js`, { cwd: __dirname }),
    ).resolves.toBeDefined();
});
