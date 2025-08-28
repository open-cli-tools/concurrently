import fs, { PathOrFileDescriptor } from 'fs';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { CommandInfo } from '../command';
import { ExpandWildcard } from './expand-wildcard';

let parser: ExpandWildcard;
let readPackage: Mock;
let readDeno: Mock;

const createCommandInfo = (command: string): CommandInfo => ({
    command,
    name: '',
});

beforeEach(() => {
    readDeno = vi.fn();
    readPackage = vi.fn();
    parser = new ExpandWildcard(readDeno, readPackage);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('ExpandWildcard#readDeno', () => {
    it('can read deno.json', () => {
        const expectedDeno = {
            name: 'deno',
            version: '1.14.0',
        };
        vi.spyOn(fs, 'existsSync').mockImplementation((path: PathOrFileDescriptor) => {
            return path === 'deno.json';
        });
        vi.spyOn(fs, 'readFileSync').mockImplementation((path: PathOrFileDescriptor) => {
            if (path === 'deno.json') {
                return JSON.stringify(expectedDeno);
            }
            return '';
        });

        const actualReadDeno = ExpandWildcard.readDeno();
        expect(actualReadDeno).toEqual(expectedDeno);
    });

    it('can read deno.jsonc', () => {
        const expectedDeno = {
            name: 'deno',
            version: '1.14.0',
        };
        vi.spyOn(fs, 'existsSync').mockImplementation((path: PathOrFileDescriptor) => {
            return path === 'deno.jsonc';
        });
        vi.spyOn(fs, 'readFileSync').mockImplementation((path: PathOrFileDescriptor) => {
            if (path === 'deno.jsonc') {
                return '/* comment */\n' + JSON.stringify(expectedDeno);
            }
            return '';
        });

        const actualReadDeno = ExpandWildcard.readDeno();
        expect(actualReadDeno).toEqual(expectedDeno);
    });

    it('prefers deno.json over deno.jsonc', () => {
        const expectedDeno = {
            name: 'deno',
            version: '1.14.0',
        };
        vi.spyOn(fs, 'existsSync').mockImplementation((path: PathOrFileDescriptor) => {
            return path === 'deno.json' || path === 'deno.jsonc';
        });
        vi.spyOn(fs, 'readFileSync').mockImplementation((path: PathOrFileDescriptor) => {
            if (path === 'deno.json') {
                return JSON.stringify(expectedDeno);
            }
            return '';
        });

        const actualReadDeno = ExpandWildcard.readDeno();
        expect(actualReadDeno).toEqual(expectedDeno);
    });

    it('can handle errors reading deno', () => {
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
            throw new Error('Error reading deno');
        });

        expect(() => ExpandWildcard.readDeno()).not.toThrow();
        expect(ExpandWildcard.readDeno()).toEqual({});
    });
});

describe('ExpandWildcard#readPackage', () => {
    it('can read package', () => {
        const expectedPackage = {
            name: 'concurrently',
            version: '6.4.0',
        };
        vi.spyOn(fs, 'readFileSync').mockImplementation((path: PathOrFileDescriptor) => {
            if (path === 'package.json') {
                return JSON.stringify(expectedPackage);
            }
            return '';
        });

        const actualReadPackage = ExpandWildcard.readPackage();
        expect(actualReadPackage).toEqual(expectedPackage);
    });

    it('can handle errors reading package', () => {
        vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
            throw new Error('Error reading package');
        });

        expect(() => ExpandWildcard.readPackage()).not.toThrow();
        expect(ExpandWildcard.readPackage()).toEqual({});
    });
});

it('returns same command if not an npm run command', () => {
    const commandInfo = createCommandInfo('npm test');

    expect(readDeno).not.toHaveBeenCalled();
    expect(readPackage).not.toHaveBeenCalled();
    expect(parser.parse(commandInfo)).toBe(commandInfo);
});

it('returns same command if not a deno task command', () => {
    const commandInfo = createCommandInfo('deno run');

    expect(readDeno).not.toHaveBeenCalled();
    expect(readPackage).not.toHaveBeenCalled();
    expect(parser.parse(commandInfo)).toBe(commandInfo);
});

it('returns same command if no wildcard present', () => {
    const commandInfo = createCommandInfo('npm run foo bar');

    expect(readPackage).not.toHaveBeenCalled();
    expect(parser.parse(commandInfo)).toBe(commandInfo);
});

it('expands to nothing if no scripts exist in package.json', () => {
    readPackage.mockReturnValue({});

    expect(parser.parse(createCommandInfo('npm run foo-*-baz qux'))).toEqual([]);
});

it('expands to nothing if no tasks exist in Deno config and no scripts exist in NodeJS config', () => {
    readDeno.mockReturnValue({});
    readPackage.mockReturnValue({});

    expect(parser.parse(createCommandInfo('deno task foo-*-baz qux'))).toEqual([]);
});

describe.each(['npm run', 'yarn run', 'pnpm run', 'bun run', 'node --run'])(
    `with a '%s' prefix`,
    (command) => {
        it('expands to all scripts matching pattern', () => {
            readPackage.mockReturnValue({
                scripts: {
                    'foo-bar-baz': '',
                    'foo--baz': '',
                },
            });

            expect(parser.parse(createCommandInfo(`${command} foo-*-baz qux`))).toEqual([
                { name: 'bar', command: `${command} foo-bar-baz qux` },
                { name: '', command: `${command} foo--baz qux` },
            ]);
        });

        it('uses wildcard match of script as command name', () => {
            readPackage.mockReturnValue({
                scripts: {
                    'watch-js': '',
                    'watch-css': '',
                },
            });

            expect(
                parser.parse({
                    name: 'watch-*',
                    command: `${command} watch-*`,
                }),
            ).toEqual([
                { name: 'js', command: `${command} watch-js` },
                { name: 'css', command: `${command} watch-css` },
            ]);
        });

        it('uses existing command name as prefix to the wildcard match', () => {
            readPackage.mockReturnValue({
                scripts: {
                    'watch-js': '',
                    'watch-css': '',
                },
            });

            expect(
                parser.parse({
                    name: 'w:',
                    command: `${command} watch-*`,
                }),
            ).toEqual([
                { name: 'w:js', command: `${command} watch-js` },
                { name: 'w:css', command: `${command} watch-css` },
            ]);
        });

        it('allows negation', () => {
            readPackage.mockReturnValue({
                scripts: {
                    'lint:js': '',
                    'lint:ts': '',
                    'lint:fix:js': '',
                    'lint:fix:ts': '',
                },
            });

            expect(parser.parse(createCommandInfo(`${command} lint:*(!fix)`))).toEqual([
                { name: 'js', command: `${command} lint:js` },
                { name: 'ts', command: `${command} lint:ts` },
            ]);
        });

        it('caches scripts upon calls', () => {
            readPackage.mockReturnValue({});

            parser.parse(createCommandInfo(`${command} foo-*-baz qux`));
            parser.parse(createCommandInfo(`${command} foo-*-baz qux`));

            expect(readPackage).toHaveBeenCalledTimes(1);
        });

        it("doesn't read Deno config", () => {
            readPackage.mockReturnValue({});

            parser.parse(createCommandInfo(`${command} foo-*-baz qux`));

            expect(readDeno).not.toHaveBeenCalled();
        });
    },
);

describe(`with a 'deno task' prefix`, () => {
    it('expands to all scripts matching pattern', () => {
        readDeno.mockReturnValue({
            tasks: {
                'foo-bar-baz': '',
                'foo--baz': '',
            },
        });
        readPackage.mockReturnValue({
            scripts: {
                'foo-foo-baz': '',
            },
        });

        expect(parser.parse(createCommandInfo(`deno task foo-*-baz qux`))).toEqual([
            { name: 'bar', command: `deno task foo-bar-baz qux` },
            { name: '', command: `deno task foo--baz qux` },
            { name: 'foo', command: `deno task foo-foo-baz qux` },
        ]);
    });

    it('uses wildcard match of script as command name', () => {
        readDeno.mockReturnValue({
            tasks: {
                'watch-sass': '',
            },
        });
        readPackage.mockReturnValue({
            scripts: {
                'watch-js': '',
                'watch-css': '',
            },
        });

        expect(
            parser.parse({
                name: '',
                command: `deno task watch-*`,
            }),
        ).toEqual([
            { name: 'sass', command: `deno task watch-sass` },
            { name: 'js', command: `deno task watch-js` },
            { name: 'css', command: `deno task watch-css` },
        ]);
    });

    it('uses existing command name as prefix to the wildcard match', () => {
        readDeno.mockReturnValue({
            tasks: {
                'watch-sass': '',
            },
        });
        readPackage.mockReturnValue({
            scripts: {
                'watch-js': '',
                'watch-css': '',
            },
        });

        expect(
            parser.parse({
                name: 'w:',
                command: `deno task watch-*`,
            }),
        ).toEqual([
            { name: 'w:sass', command: `deno task watch-sass` },
            { name: 'w:js', command: `deno task watch-js` },
            { name: 'w:css', command: `deno task watch-css` },
        ]);
    });

    it('allows negation', () => {
        readDeno.mockReturnValue({
            tasks: {
                'lint:sass': '',
                'lint:fix:sass': '',
            },
        });
        readPackage.mockReturnValue({
            scripts: {
                'lint:js': '',
                'lint:ts': '',
                'lint:fix:js': '',
                'lint:fix:ts': '',
            },
        });

        expect(parser.parse(createCommandInfo(`deno task lint:*(!fix)`))).toEqual([
            { name: 'sass', command: `deno task lint:sass` },
            { name: 'js', command: `deno task lint:js` },
            { name: 'ts', command: `deno task lint:ts` },
        ]);
    });

    it('caches scripts upon calls', () => {
        readDeno.mockReturnValue({});
        readPackage.mockReturnValue({});

        parser.parse(createCommandInfo(`deno task foo-*-baz qux`));
        parser.parse(createCommandInfo(`deno task foo-*-baz qux`));

        expect(readDeno).toHaveBeenCalledTimes(1);
        expect(readPackage).toHaveBeenCalledTimes(1);
    });
});
