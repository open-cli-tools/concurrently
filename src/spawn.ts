import { ChildProcess, spawn as baseSpawn, SpawnOptions } from 'child_process';
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
    raw = false,
    env = {},
    hide = false,
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
     * Whether to customize the options for spawning processes in raw mode.
     * Defaults to false.
     */
    raw?: boolean;

    /**
     * Map of custom environment variables to include in the spawn options.
     */
    env?: Record<string, unknown>;

    /**
     * Whether to hide the standard output.
     * Defaults to false.
     */
    hide?: boolean;
}): SpawnOptions => ({
    cwd: cwd || process.cwd(),
    ...(raw && !hide && { stdio: 'inherit' as const }),
    ...(/^win/.test(process.platform) && { detached: false }),
    env: {
        ...(colorSupport ? { FORCE_COLOR: colorSupport.level.toString() } : {}),
        ...process.env,
        ...env,
    },
});
