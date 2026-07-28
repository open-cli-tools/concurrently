import { describe, expect, it, vi } from 'vitest';

import { ensureUtf8Codepage, SpawnSync } from './console-codepage.js';

const win32 = { platform: 'win32' as const };
const linux = { platform: 'linux' as const };

const ok = (stdout: string) => ({ status: 0, stdout, error: undefined });
const failed = () => ({ status: 1, stdout: '', error: undefined });

describe('ensureUtf8Codepage()', () => {
    it('does nothing on non-Windows platforms', () => {
        const spawnSync = vi.fn();
        ensureUtf8Codepage(spawnSync as unknown as SpawnSync, linux)();
        expect(spawnSync).not.toHaveBeenCalled();
    });

    it('does nothing when the codepage is already UTF-8', () => {
        const spawnSync = vi.fn().mockReturnValue(ok('Active code page: 65001.'));
        const restore = ensureUtf8Codepage(spawnSync as unknown as SpawnSync, win32);

        expect(spawnSync).toHaveBeenCalledTimes(1);

        restore();
        expect(spawnSync).toHaveBeenCalledTimes(1);
    });

    it('sets the codepage to UTF-8 and restores the original one it read', () => {
        const spawnSync = vi.fn().mockReturnValue(ok('Aktive Codepage: 850.'));
        const restore = ensureUtf8Codepage(spawnSync as unknown as SpawnSync, win32);

        expect(spawnSync).toHaveBeenNthCalledWith(1, 'cmd.exe', ['/s', '/c', 'chcp'], {
            encoding: 'utf8',
        });
        expect(spawnSync).toHaveBeenNthCalledWith(2, 'cmd.exe', ['/s', '/c', 'chcp 65001'], {
            stdio: 'ignore',
        });

        restore();
        expect(spawnSync).toHaveBeenNthCalledWith(3, 'cmd.exe', ['/s', '/c', 'chcp 850'], {
            stdio: 'ignore',
        });
    });

    it('only restores once, even if called multiple times', () => {
        const spawnSync = vi.fn().mockReturnValue(ok('Active code page: 850.'));
        const restore = ensureUtf8Codepage(spawnSync as unknown as SpawnSync, win32);

        restore();
        restore();
        expect(spawnSync).toHaveBeenCalledTimes(3);
    });

    it('does nothing and never throws when reading the codepage fails', () => {
        const spawnSync = vi.fn().mockReturnValue(failed());
        const restore = ensureUtf8Codepage(spawnSync as unknown as SpawnSync, win32);

        expect(() => restore()).not.toThrow();
        expect(spawnSync).toHaveBeenCalledTimes(1);
    });

    it('does nothing and never throws when spawnSync itself throws', () => {
        const spawnSync = vi.fn().mockImplementation(() => {
            throw new Error('boom');
        });

        expect(() => ensureUtf8Codepage(spawnSync as unknown as SpawnSync, win32)()).not.toThrow();
    });

    it('does nothing when setting the codepage fails', () => {
        const spawnSync = vi
            .fn()
            .mockReturnValueOnce(ok('Active code page: 850.'))
            .mockReturnValueOnce(failed());
        const restore = ensureUtf8Codepage(spawnSync as unknown as SpawnSync, win32);

        expect(spawnSync).toHaveBeenCalledTimes(2);

        restore();
        // No third call: setting UTF-8 failed, so there's nothing to restore.
        expect(spawnSync).toHaveBeenCalledTimes(2);
    });
});
