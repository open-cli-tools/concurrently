import { describe, expect, it, vi } from 'vitest';

import { getSpawnOpts, spawn } from './spawn.js';

const baseProcess = {
    platform: 'win32' as const,
    cwd: () => '',
    env: {},
};

describe('spawn()', () => {
    it('spawns the given command', async () => {
        const fakeSpawn = vi.fn();
        spawn('echo banana', {}, fakeSpawn, baseProcess);
        expect(fakeSpawn).toHaveBeenCalled();
        expect(fakeSpawn.mock.calls[0][1].join(' ')).toContain('echo banana');
    });

    it('returns spawned process', async () => {
        const childProcess = {};
        const fakeSpawn = vi.fn().mockReturnValue(childProcess);
        const child = spawn('echo banana', {}, fakeSpawn, baseProcess);
        expect(child).toBe(childProcess);
    });
});

describe('getSpawnOpts()', () => {
    it('sets detached mode to false for Windows platform', () => {
        expect(getSpawnOpts({ process: baseProcess }).detached).toBe(false);
    });

    it('sets stdio to pipe when stdio mode is normal', () => {
        expect(getSpawnOpts({ stdio: 'normal' }).stdio).toEqual(['pipe', 'pipe', 'pipe']);
    });

    it('sets stdio to inherit when stdio mode is raw', () => {
        expect(getSpawnOpts({ stdio: 'raw' }).stdio).toEqual(['inherit', 'inherit', 'inherit']);
    });

    it('sets stdio to ignore stdout + stderr when stdio mode is hidden', () => {
        expect(getSpawnOpts({ stdio: 'hidden' }).stdio).toEqual(['pipe', 'ignore', 'ignore']);
    });

    it('sets an ipc channel at the specified descriptor index', () => {
        const opts = getSpawnOpts({ ipc: 3 });
        expect(opts.stdio?.[3]).toBe('ipc');
    });

    it('throws if the ipc channel is <= 2', () => {
        const fn = () => getSpawnOpts({ ipc: 0 });
        expect(fn).toThrow();
    });

    it('merges FORCE_COLOR into env vars if color supported', () => {
        const process = { ...baseProcess, env: { foo: 'bar' } };
        expect(getSpawnOpts({ process, colorSupport: false }).env).toEqual(process.env);
        expect(getSpawnOpts({ process, colorSupport: { level: 1 } }).env).toEqual({
            FORCE_COLOR: '1',
            foo: 'bar',
        });
    });

    it('sets default cwd to process.cwd()', () => {
        const process = { ...baseProcess, cwd: () => 'process-cwd' };
        expect(getSpawnOpts({ process }).cwd).toBe('process-cwd');
    });

    it('overrides default cwd', () => {
        const cwd = 'foobar';
        expect(getSpawnOpts({ cwd }).cwd).toBe(cwd);
    });
});
