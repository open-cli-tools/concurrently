import { SpawnOptions } from 'child_process';
import supportsColor from 'supports-color';

export const getSpawnOpts = ({
    colorSupport = supportsColor.stdout,
    cwd,
    process = global.process,
    raw = false,
    env = {},
}: {
    /**
     * What the color support of the spawned processes should be.
     * If set to `false`, then no colors should be output.
     *
     * Defaults to whatever the terminal's stdout support is.
     */
    colorSupport?: Pick<supportsColor.supportsColor.Level, 'level'> | false,

    /**
     * The NodeJS process.
     */
    process?: Pick<NodeJS.Process, 'cwd' | 'platform' | 'env'>,

    /**
     * A custom working directory to spawn processes in.
     * Defaults to `process.cwd()`.
     */
    cwd?: string,

    /**
     * Whether to customize the options for spawning processes in raw mode.
     * Defaults to false.
     */
    raw?: boolean,

    /**
     * Map of custom environment variables to include in the spawn options.
     */
    env?: Record<string, any>
}): SpawnOptions => Object.assign(
    {
        cwd: cwd || process.cwd(),
    },
    raw && { stdio: 'inherit' as const },
    /^win/.test(process.platform) && { detached: false },
    { env: Object.assign(colorSupport ? { FORCE_COLOR: colorSupport.level } : {}, process.env, env) }
);
