import assert from 'node:assert';
import { ChildProcess, IOType, spawn as baseSpawn, SpawnOptions } from 'node:child_process';
import path from 'node:path';
import nodeProcess from 'node:process';

import supportsColor, { ColorSupport } from 'supports-color';

import { SpawnCommand } from './command.js';
import { UnreachableError } from './utils.js';

/**
 * Creates a spawn function that uses the given shell executable.
 *
 * The shell is resolved in the following priority order:
 * 1. explicit shell option
 * 2. `npm_config_script_shell` env variable
 * 3. platform default (`cmd.exe` on Windows, `/bin/sh` elsewhere)
 *
 * @see https://docs.npmjs.com/cli/v6/using-npm/config#script-shell
 */
export function createSpawn(
    shell?: string,
    // For testing
    spawn: (command: string, args: string[], options: SpawnOptions) => ChildProcess = baseSpawn,
    process: Pick<NodeJS.Process, 'platform' | 'env'> = nodeProcess,
): SpawnCommand {
    const resolved = resolveShell(shell, process);
    return (command, spawnOpts) => {
        const { file, args, shellOptions } = getShellSpawnArgs(resolved, command);
        return spawn(file, args, { ...spawnOpts, ...shellOptions });
    };
}

const NPM_SCRIPT_SHELL_ENV = 'npm_config_script_shell';

/**
 * Resolves which shell executable to use when spawning commands.
 * @see {@link createSpawn()}
 */
function resolveShell(
    shell?: string,
    process: Pick<NodeJS.Process, 'platform' | 'env'> = nodeProcess,
): string {
    if (shell) {
        return shell;
    }

    const npmScriptShell = process.env[NPM_SCRIPT_SHELL_ENV];
    if (npmScriptShell) {
        return npmScriptShell;
    }

    return process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
}

/**
 * Builds spawn file/args for the given shell and command string.
 */
function getShellSpawnArgs(
    shellPath: string,
    command: string,
): {
    file: string;
    args: string[];
    shellOptions?: Pick<SpawnOptions, 'windowsVerbatimArguments'>;
} {
    const kind = detectShellKind(shellPath);
    switch (kind) {
        case 'cmd':
            return {
                file: shellPath,
                args: ['/s', '/c', `"${command}"`],
                shellOptions: { windowsVerbatimArguments: true },
            };
        case 'powershell':
            return {
                file: shellPath,
                args: ['-NoProfile', '-Command', command],
            };
        case 'posix':
            return {
                file: shellPath,
                args: ['-c', command],
            };
        default:
            throw new UnreachableError(kind);
    }
}

export type ShellKind = 'cmd' | 'posix' | 'powershell';

/**
 * Detects which argument style to use when spawning the given shell executable.
 */
function detectShellKind(shellPath: string): ShellKind {
    const normalized = shellPath.replace(/\\/g, '/');
    const base = path
        .basename(normalized)
        .toLowerCase()
        .replace(/\.exe$/i, '');

    if (base === 'cmd') {
        return 'cmd';
    }
    if (base === 'powershell' || base === 'pwsh') {
        return 'powershell';
    }
    return 'posix';
}

export const getSpawnOpts = ({
    colorSupport = supportsColor.stdout,
    cwd,
    process = nodeProcess,
    ipc,
    stdio = 'normal',
    env = {},
}: {
    /**
     * What the color support of the spawned processes should be.
     * If set to `false`, then no colors should be output.
     *
     * Defaults to whatever the terminal's stdout support is.
     */
    colorSupport?: Pick<ColorSupport, 'level'> | false;

    /**
     * The NodeJS process.
     */
    process?: Pick<NodeJS.Process, 'cwd' | 'platform' | 'env'>;

    /**
     * A custom working directory to spawn processes in.
     * Defaults to `process.cwd()`.
     */
    cwd?: string;

    /**
     * The file descriptor number at which the channel for inter-process communication
     * should be set up.
     */
    ipc?: number;

    /**
     * Which stdio mode to use. Raw implies inheriting the parent process' stdio.
     *
     * - `normal`: all of stdout, stderr and stdin are piped
     * - `hidden`: stdin is piped, stdout/stderr outputs are ignored
     * - `raw`: all of stdout, stderr and stdin are inherited from the main process
     *
     * Defaults to `normal`.
     */
    stdio?: 'normal' | 'hidden' | 'raw';

    /**
     * Map of custom environment variables to include in the spawn options.
     */
    env?: Record<string, unknown>;
}): SpawnOptions => {
    const stdioValues: (IOType | 'ipc')[] =
        stdio === 'normal'
            ? ['pipe', 'pipe', 'pipe']
            : stdio === 'raw'
              ? ['inherit', 'inherit', 'inherit']
              : ['pipe', 'ignore', 'ignore'];

    if (ipc != null) {
        // Avoid overriding the stdout/stderr/stdin
        assert.ok(ipc > 2, '[concurrently] the IPC channel number should be > 2');
        stdioValues[ipc] = 'ipc';
    }

    return {
        cwd: cwd || process.cwd(),
        stdio: stdioValues,
        ...(process.platform.startsWith('win') && { detached: false }),
        env: {
            ...(colorSupport ? { FORCE_COLOR: colorSupport.level.toString() } : {}),
            ...process.env,
            ...env,
        },
    };
};
