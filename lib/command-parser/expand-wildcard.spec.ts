import fs, { PathOrFileDescriptor } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { CommandInfo } from '../command.js';
import { ExpandWildcard } from './expand-wildcard.js';

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
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('#readDeno()', () => {
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
                return `/* comment */\n${JSON.stringify(expectedDeno)}`;
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

describe('#readPackage()', () => {
    it('can read package', () => {
        const expectedPackage = {
            name: 'concurrently',
            version: '6.4.0',
        };
        vi.spyOn(fs, 'existsSync').mockImplementation((path: PathOrFileDescriptor) => {
            return path === 'package.json';
        });
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

    it('can read package.json5', () => {
        const expectedPackage = {
            name: 'concurrently',
            version: '6.4.0',
            scripts: {
                'test:unit': '',
            },
        };
        vi.spyOn(fs, 'existsSync').mockImplementation((path: PathOrFileDescriptor) => {
            return path === 'package.json5';
        });
        vi.spyOn(fs, 'readFileSync').mockImplementation((path: PathOrFileDescriptor) => {
            if (path === 'package.json5') {
                return `/* comment */\n${JSON.stringify(expectedPackage)}`;
            }
            return '';
        });

        const actualReadPackage = ExpandWildcard.readPackage();
        expect(actualReadPackage).toEqual(expectedPackage);
    });

    it('prefers package.json over package.json5', () => {
        const expectedPackage = {
            name: 'from-json',
            version: '1.0.0',
        };
        vi.spyOn(fs, 'existsSync').mockImplementation((path: PathOrFileDescriptor) => {
            return path === 'package.json' || path === 'package.json5';
        });
        vi.spyOn(fs, 'readFileSync').mockImplementation((path: PathOrFileDescriptor) => {
            if (path === 'package.json') {
                return JSON.stringify(expectedPackage);
            }
            return '';
        });

        const actualReadPackage = ExpandWildcard.readPackage();
        expect(actualReadPackage).toEqual(expectedPackage);
    });
});

describe.each([undefined, '/bin/sh'])('with shell %s', (shell) => {
    beforeEach(() => {
        parser = new ExpandWildcard(readDeno, readPackage, shell);
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
                    {
                        name: 'bar',
                        command: shell
                            ? `${command} 'foo-bar-baz' qux`
                            : `${command} foo-bar-baz qux`,
                    },
                    {
                        name: '',
                        command: shell ? `${command} 'foo--baz' qux` : `${command} foo--baz qux`,
                    },
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
                    {
                        name: 'js',
                        command: shell ? `${command} 'watch-js'` : `${command} watch-js`,
                    },
                    {
                        name: 'css',
                        command: shell ? `${command} 'watch-css'` : `${command} watch-css`,
                    },
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
                    {
                        name: 'w:js',
                        command: shell ? `${command} 'watch-js'` : `${command} watch-js`,
                    },
                    {
                        name: 'w:css',
                        command: shell ? `${command} 'watch-css'` : `${command} watch-css`,
                    },
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
                    { name: 'js', command: shell ? `${command} 'lint:js'` : `${command} lint:js` },
                    { name: 'ts', command: shell ? `${command} 'lint:ts'` : `${command} lint:ts` },
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
                {
                    name: 'bar',
                    command: shell ? "deno task 'foo-bar-baz' qux" : `deno task foo-bar-baz qux`,
                },
                {
                    name: '',
                    command: shell ? "deno task 'foo--baz' qux" : `deno task foo--baz qux`,
                },
                {
                    name: 'foo',
                    command: shell ? "deno task 'foo-foo-baz' qux" : `deno task foo-foo-baz qux`,
                },
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
                {
                    name: 'sass',
                    command: shell ? "deno task 'watch-sass'" : `deno task watch-sass`,
                },
                { name: 'js', command: shell ? "deno task 'watch-js'" : `deno task watch-js` },
                { name: 'css', command: shell ? "deno task 'watch-css'" : `deno task watch-css` },
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
                {
                    name: 'w:sass',
                    command: shell ? "deno task 'watch-sass'" : `deno task watch-sass`,
                },
                { name: 'w:js', command: shell ? "deno task 'watch-js'" : `deno task watch-js` },
                { name: 'w:css', command: shell ? "deno task 'watch-css'" : `deno task watch-css` },
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
                { name: 'sass', command: shell ? "deno task 'lint:sass'" : `deno task lint:sass` },
                { name: 'js', command: shell ? "deno task 'lint:js'" : `deno task lint:js` },
                { name: 'ts', command: shell ? "deno task 'lint:ts'" : `deno task lint:ts` },
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
});
