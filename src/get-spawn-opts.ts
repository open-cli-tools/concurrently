import { SpawnOptions } from 'child_process';
import * as supportsColor from 'supports-color';

interface GetSpawnOptsParams {
    colorSupport?: supportsColor.supportsColor.SupportsColor;
    cwd?: string;
    process?: Pick<NodeJS.Process, 'cwd' | 'platform' | 'env'>;
    raw?: boolean;
    env?: object;
}

export const getSpawnOpts = ({
    colorSupport = supportsColor.stdout,
    cwd,
    process = global.process,
    raw = false,
    env = {},
}: GetSpawnOptsParams): SpawnOptions => Object.assign(
    {
        cwd: cwd || process.cwd(),
    },
    raw && { stdio: 'inherit' as const },
    /^win/.test(process.platform) && { detached: false },
    { env: Object.assign(colorSupport ? { FORCE_COLOR: colorSupport.level } : {}, process.env, env) }
);
