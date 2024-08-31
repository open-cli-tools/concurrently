import fs from 'fs';

import { CommandInfo } from '../command';
import { ExpandNpmWildcard } from './expand-npm-wildcard';

let parser: ExpandNpmWildcard;
let readPkg: jest.Mock;

const createCommandInfo = (command: string): CommandInfo => ({
    command,
    name: '',
});

beforeEach(() => {
    readPkg = jest.fn();
    parser = new ExpandNpmWildcard(readPkg);
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('ExpandNpmWildcard#readPackage', () => {
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

    expect(readPkg).not.toHaveBeenCalled();
    expect(parser.parse(commandInfo)).toBe(commandInfo);
});

it('returns same command if no wildcard present', () => {
    const commandInfo = createCommandInfo('npm run foo bar');

    expect(readPkg).not.toHaveBeenCalled();
    expect(parser.parse(commandInfo)).toBe(commandInfo);
});

it('expands to nothing if no scripts exist in package.json', () => {
    readPkg.mockReturnValue({});

    expect(parser.parse(createCommandInfo('npm run foo-*-baz qux'))).toEqual([]);
});

describe.each([
    ['npm', 'run'],
    ['yarn', 'run'],
    ['pnpm', 'run'],
    ['bun', 'run'],
    ['node', '--run'],
])(`with a %s: prefix`, (npmCmd, runCmd) => {
    it('expands to all scripts matching pattern', () => {
        readPkg.mockReturnValue({
            scripts: {
                'foo-bar-baz': '',
                'foo--baz': '',
            },
        });

        expect(parser.parse(createCommandInfo(`${npmCmd} ${runCmd} foo-*-baz qux`))).toEqual([
            { name: 'bar', command: `${npmCmd} ${runCmd} foo-bar-baz qux` },
            { name: '', command: `${npmCmd} ${runCmd} foo--baz qux` },
        ]);
    });

    it('uses wildcard match of script as command name', () => {
        readPkg.mockReturnValue({
            scripts: {
                'watch-js': '',
                'watch-css': '',
            },
        });

        expect(
            parser.parse({
                name: '',
                command: `${npmCmd} ${runCmd} watch-*`,
            }),
        ).toEqual([
            { name: 'js', command: `${npmCmd} ${runCmd} watch-js` },
            { name: 'css', command: `${npmCmd} ${runCmd} watch-css` },
        ]);
    });

    it('uses existing command name as prefix to the wildcard match', () => {
        readPkg.mockReturnValue({
            scripts: {
                'watch-js': '',
                'watch-css': '',
            },
        });

        expect(
            parser.parse({
                name: 'w:',
                command: `${npmCmd} ${runCmd} watch-*`,
            }),
        ).toEqual([
            { name: 'w:js', command: `${npmCmd} ${runCmd} watch-js` },
            { name: 'w:css', command: `${npmCmd} ${runCmd} watch-css` },
        ]);
    });

    it('allows negation', () => {
        readPkg.mockReturnValue({
            scripts: {
                'lint:js': '',
                'lint:ts': '',
                'lint:fix:js': '',
                'lint:fix:ts': '',
            },
        });

        expect(parser.parse(createCommandInfo(`${npmCmd} ${runCmd} lint:*(!fix)`))).toEqual([
            { name: 'js', command: `${npmCmd} ${runCmd} lint:js` },
            { name: 'ts', command: `${npmCmd} ${runCmd} lint:ts` },
        ]);
    });

    it('caches scripts upon calls', () => {
        readPkg.mockReturnValue({});
        parser.parse(createCommandInfo(`${npmCmd} run foo-*-baz qux`));
        parser.parse(createCommandInfo(`${npmCmd} run foo-*-baz qux`));

        expect(readPkg).toHaveBeenCalledTimes(1);
    });
});
