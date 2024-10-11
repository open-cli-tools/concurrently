import fs from 'fs';

import { CommandInfo } from '../command';
import { ExpandNpmWildcard } from './expand-npm-wildcard';

let parser: ExpandNpmWildcard;
let readPackage: jest.Mock;
let readDeno: jest.Mock;

const createCommandInfo = (command: string): CommandInfo => ({
    command,
    name: '',
});

beforeEach(() => {
    readDeno = jest.fn();
    readPackage = jest.fn();
    parser = new ExpandNpmWildcard(readDeno, readPackage);
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('ExpandWildcard#readDeno', () => {
    it('can read deno', () => {
        const expectedDeno = {
            name: 'deno',
            version: '1.14.0',
        };
        jest.spyOn(fs, 'readFileSync').mockImplementation((path) => {
            if (path === 'deno.json') {
                return JSON.stringify(expectedDeno);
            }
            return '';
        });

        const actualReadDeno = ExpandNpmWildcard.readDeno();
        expect(actualReadDeno).toEqual(expectedDeno);
    });

    it('can handle errors reading deno', () => {
        jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
            throw new Error('Error reading deno');
        });

        expect(() => ExpandNpmWildcard.readDeno()).not.toThrow();
        expect(ExpandNpmWildcard.readDeno()).toEqual({});
    });
});

describe('ExpandWildcard#readPackage', () => {
    it('can read package', () => {
        const expectedPackage = {
            name: 'concurrently',
            version: '6.4.0',
        };
        jest.spyOn(fs, 'readFileSync').mockImplementation((path) => {
            if (path === 'package.json') {
                return JSON.stringify(expectedPackage);
            }
            return '';
        });

        const actualReadPackage = ExpandNpmWildcard.readPackage();
        expect(actualReadPackage).toEqual(expectedPackage);
    });

    it('can handle errors reading package', () => {
        jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
            throw new Error('Error reading package');
        });

        expect(() => ExpandNpmWildcard.readPackage()).not.toThrow();
        expect(ExpandNpmWildcard.readPackage()).toEqual({});
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

it('expands to nothing if no tasks exist in deno.json and no scripts exist in package.json', () => {
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
                    name: '',
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

        it("doesn't read deno.json", () => {
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
