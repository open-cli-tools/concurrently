import { exec as originalExec } from 'child_process';
import * as util from 'util';
import { beforeAll, expect, it } from 'vitest';

const exec = util.promisify(originalExec);

beforeAll(async () => {
    await exec('pnpm build', { cwd: `${__dirname}/..` });
    await exec('pnpm install', { cwd: __dirname });
}, 20000);

it.each(['cjs-import', 'cjs-require', 'esm'])(
    '%s',
    async (project) => {
        // Use as separate execs as tsc outputs to stdout, instead of stderr, and so its text isn't shown
        await exec(`tsc -p ${project}`, { cwd: __dirname }).catch((err) =>
            Promise.reject(err.stdout),
        );
        await expect(
            exec(`node ${project}/dist/smoke-test.js`, { cwd: __dirname }),
        ).resolves.toBeDefined();
    },
    10000,
);
