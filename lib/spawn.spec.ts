import { describe, expect, it, vi } from 'vitest';

import { createSpawn, getSpawnOpts, ShellKind } from './spawn.js';
import { UnreachableError } from './utils.js';

const baseProcess = {
    platform: 'win32' as const,
    cwd: () => '',
    env: {},
};

describe('createSpawn()', () => {
    const command = 'echo banana';
    const makeShellArgs = (kind: ShellKind) => {
        switch (kind) {
            case 'cmd':
                return ['/s', '/c', `"${command}"`];
            case 'posix':
                return ['-c', command];
            case 'powershell':
                return ['-NoProfile', '-Command', command];
            default:
                throw new UnreachableError(kind);
        }
    };

    describe('when shell is not provided', () => {
        it('uses npm_config_script_shell when set', () => {
            const fakeSpawn = vi.fn();
            const spawn = createSpawn(undefined, fakeSpawn, {
                ...baseProcess,
                env: { npm_config_script_shell: 'C:\\Git\\bin\\bash.exe' },
            });
            spawn(command, {});
            expect(fakeSpawn).toHaveBeenCalledWith('C:\\Git\\bin\\bash.exe', ['-c', command], {});
        });

        it('creates spawn function that uses cmd.exe on Windows', () => {
            const fakeSpawn = vi.fn();
            const spawn = createSpawn(undefined, fakeSpawn, { ...baseProcess, platform: 'win32' });
            spawn(command, {});
            expect(fakeSpawn).toHaveBeenCalledWith('cmd.exe', ['/s', '/c', `"${command}"`], {
                windowsVerbatimArguments: true,
            });
        });

        it('creates spawn function that uses /bin/sh on non-Windows platforms', () => {
            const fakeSpawn = vi.fn();
            const spawn = createSpawn(undefined, fakeSpawn, { ...baseProcess, platform: 'linux' });
            spawn(command, {});
            expect(fakeSpawn).toHaveBeenCalledWith(
                '/bin/sh',
                ['-c', command],
                expect.objectContaining({}),
            );
        });
    });

    describe.each([
        { style: 'cmd', file: 'cmd.exe' },
        { style: 'posix', file: 'C:\\bash.exe' },
        { style: 'powershell', file: 'pwsh' },
        { style: 'posix', file: '/bin/sh' },
        { style: 'posix', file: '/bin/zsh' },
    ] as const)('when shell is set to $file', ({ style, file }) => {
        it(`creates spawn function that uses ${file} as shell with ${style} style arguments`, () => {
            const fakeSpawn = vi.fn();
            const spawn = createSpawn(file, fakeSpawn, baseProcess);
            spawn(command, {});
            expect(fakeSpawn).toHaveBeenCalledWith(
                file,
                makeShellArgs(style),
                expect.objectContaining({}),
            );
        });
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
