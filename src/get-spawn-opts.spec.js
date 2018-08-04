const getSpawnOpts = require('./get-spawn-opts');

it('sets detached mode to false for Windows platform', () => {
    expect(getSpawnOpts({ process: { platform: 'win32' } }).detached).toBe(false);
});

it('sets stdio to inherit when raw', () => {
    expect(getSpawnOpts({ raw: true }).stdio).toBe('inherit');
});

it('merges FORCE_COLOR into env vars if color supported', () => {
    const process = { env: { foo: 'bar' } };
    expect(getSpawnOpts({ process, colorSupport: false }).env).toBeUndefined();
    expect(getSpawnOpts({ process, colorSupport: { level: 1 } }).env).toEqual({
        FORCE_COLOR: 1,
        foo: 'bar'
    });
});
