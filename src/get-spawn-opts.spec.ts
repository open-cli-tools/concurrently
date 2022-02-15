import { getSpawnOpts } from './get-spawn-opts';

const baseProcess = {
    platform: 'win32' as const,
    cwd: () => '',
    env: {},
};

it('sets detached mode to false for Windows platform', () => {
    expect(getSpawnOpts({ process: baseProcess }).detached).toBe(false);
});

it('sets stdio to inherit when raw', () => {
    expect(getSpawnOpts({ raw: true }).stdio).toBe('inherit');
});

it('merges FORCE_COLOR into env vars if color supported', () => {
    const process = { ...baseProcess, env: { foo: 'bar' } };
    expect(getSpawnOpts({ process, colorSupport: false }).env).toEqual(process.env);
    expect(getSpawnOpts({ process, colorSupport: { level: 1 } }).env).toEqual({
        FORCE_COLOR: 1,
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
