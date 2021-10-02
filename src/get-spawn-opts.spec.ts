import { supportsColor } from 'supports-color';
import { getSpawnOpts } from './get-spawn-opts';

const createFakeProcess = (overrides: Partial<Pick<NodeJS.Process, 'platform' | 'env'>> = {}) => ({
    platform: 'linux' as const,
    cwd: jest.fn(),
    env: {},
    ...overrides,
});

it('sets detached mode to false for Windows platform', () => {
    const process = createFakeProcess({ platform: 'win32' });
    expect(getSpawnOpts({ process }).detached).toBe(false);
});

it('sets stdio to inherit when raw', () => {
    expect(getSpawnOpts({ raw: true }).stdio).toBe('inherit');
});

it('merges FORCE_COLOR into env vars if color supported', () => {
    const process = createFakeProcess({ env: { foo: 'bar' } });
    expect(getSpawnOpts({ process, colorSupport: false }).env).toEqual(process.env);

    const colorSupport: supportsColor.Level = {
        level: 1,
        hasBasic: true,
        has16m: true,
        has256: true
    };
    expect(getSpawnOpts({ process, colorSupport }).env).toEqual({
        FORCE_COLOR: 1,
        foo: 'bar'
    });
});

it('sets default cwd to process.cwd()', () => {
    const process = createFakeProcess();
    process.cwd.mockReturnValue('process-cwd');
    expect(getSpawnOpts({ process }).cwd).toBe('process-cwd');
});

it('overrides default cwd', () => {
    const cwd = 'foobar';
    expect(getSpawnOpts({ cwd }).cwd).toBe(cwd);
});
