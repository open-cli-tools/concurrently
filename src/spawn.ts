import assert from 'assert';
import { ChildProcess, IOType, spawn as baseSpawn, SpawnOptions } from 'child_process';
import supportsColor from 'supports-color';

/**
 * Spawns a command using `cmd.exe` on Windows, or `/bin/sh` elsewhere.
 */
// Implementation based off of https://github.com/mmalecki/spawn-command/blob/v0.0.2-1/lib/spawn-command.js
export function spawn(
    command: string,
    options: SpawnOptions,
    // For testing
    spawn: (command: string, args: string[], options: SpawnOptions) => ChildProcess = baseSpawn,
    process: Pick<NodeJS.Process, 'platform'> = global.process,
): ChildProcess {
    let file = '/bin/sh';
    let args = ['-c', command];
    if (process.platform === 'win32') {
        file = 'cmd.exe';
        args = ['/s', '/c', `"${command}"`];
        options.windowsVerbatimArguments = true;
    }
    return spawn(file, args, options);
}

export const getSpawnOpts = ({
    colorSupport = supportsColor.stdout,
    cwd,
    process = global.process,
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
    colorSupport?: Pick<supportsColor.supportsColor.Level, 'level'> | false;

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
