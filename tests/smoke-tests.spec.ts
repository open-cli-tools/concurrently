import { exec as originalExec, execFile as originalExecFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import util from 'node:util';

import { beforeAll, expect, it } from 'vitest';

const exec = util.promisify(originalExec);
const execFile = util.promisify(originalExecFile);

beforeAll(async () => {
    await exec('pnpm run build');
}, 20_000);

it('spawns binary', async () => {
    await expect(exec('node dist/bin/index.js "echo test"')).resolves.toBeDefined();
});

it.each([
    ['npm run build:*', ['APP']],
    ['npm run test:*-unit(!slow)-watch && echo DONE', ['FAST', 'DONE']],
])('runs scripts matching %s', async (command, expected) => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'concurrently-wildcard-'));
    try {
        await writeFile(
            path.join(cwd, 'package.json'),
            JSON.stringify({
                scripts: {
                    'build:app@dev': 'echo APP',
                    'test:fast-unit-watch': 'echo FAST',
                    'test:slow-unit-watch': 'echo SLOW',
                },
            }),
        );
        const { stdout } = await execFile(
            process.execPath,
            [
                path.resolve(__dirname, '../dist/bin/index.js'),
                '--raw',
                '--shell',
                process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
                command,
            ],
            { cwd, env: { ...process.env, npm_config_loglevel: 'silent' } },
        );
        expect(stdout.trim().split(/\r?\n/)).toEqual(expected);
    } finally {
        await rm(cwd, { recursive: true, force: true });
    }
});

it.each(['cjs-import', 'cjs-require', 'esm'])('loads library in %s context', async (project) => {
    // Use as separate execs as tsc outputs to stdout, instead of stderr, and so its text isn't shown
    await exec(`pnpm exec tsc -p ${project}`, { cwd: __dirname }).catch((err) =>
        Promise.reject(err),
    );
    await expect(
        exec(`node ${project}/dist/smoke-test.js`, { cwd: __dirname }),
    ).resolves.toBeDefined();
});
