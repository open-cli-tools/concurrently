import { spawnSync as baseSpawnSync } from 'node:child_process';
import nodeProcess from 'node:process';

const UTF8_CODEPAGE = 65001;

export type SpawnSync = typeof baseSpawnSync;

/**
 * On Windows, concurrently pipes child-process output through a freshly-allocated console whose
 * codepage may not be UTF-8, garbling non-ASCII output from commands that rely on it (see
 * open-cli-tools/concurrently#302). This sets the console's codepage to UTF-8 once, which spawned
 * children then inherit, and returns a function that restores the original codepage.
 *
 * No-ops (and never throws) if not on Windows, if the codepage is already UTF-8, or if reading/setting
 * it fails for any reason -- this is a best-effort convenience, never something that should block
 * concurrently from running.
 */
export function ensureUtf8Codepage(
    spawnSync: SpawnSync = baseSpawnSync,
    process: Pick<NodeJS.Process, 'platform'> = nodeProcess,
): () => void {
    const noop = () => {};
    if (process.platform !== 'win32') {
        return noop;
    }

    try {
        const original = readCodepage(spawnSync);
        if (original == null || original === UTF8_CODEPAGE) {
            return noop;
        }
        if (!setCodepage(spawnSync, UTF8_CODEPAGE)) {
            return noop;
        }

        let restored = false;
        return () => {
            if (restored) {
                return;
            }
            restored = true;
            try {
                setCodepage(spawnSync, original);
            } catch {
                // Best-effort restore; nothing more we can do.
            }
        };
    } catch {
        return noop;
    }
}

function readCodepage(spawnSync: SpawnSync): number | null {
    const result = spawnSync('cmd.exe', ['/s', '/c', 'chcp'], { encoding: 'utf8' });
    if (result.error || result.status !== 0 || !result.stdout) {
        return null;
    }
    // Locale-dependent text (e.g. "Active code page: 65001." or "Aktive Codepage: 65001."),
    // so match on the number rather than the surrounding words.
    const match = /(\d+)/.exec(result.stdout);
    return match ? Number(match[1]) : null;
}

function setCodepage(spawnSync: SpawnSync, codepage: number): boolean {
    // `chcp` changes the codepage of the console this process is attached to regardless of where its
    // own stdio points, so output can be safely discarded here rather than inherited -- otherwise its
    // confirmation text (e.g. "Active code page: 65001.") would leak into concurrently's own output.
    const result = spawnSync('cmd.exe', ['/s', '/c', `chcp ${codepage}`], { stdio: 'ignore' });
    return !result.error && result.status === 0;
}
