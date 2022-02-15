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
            'name': 'concurrently',
            'version': '6.4.0',
        };
        jest.spyOn(fs, 'readFileSync').mockImplementation((path, options) => {
            if (path === 'package.json') {
                return JSON.stringify(expectedPackage);
            }
            return null;
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

for (const npmCmd of ['npm', 'yarn', 'pnpm']) {
    describe(`with an ${npmCmd}: prefix`, () => {
        it('expands to all scripts matching pattern', () => {
            readPkg.mockReturnValue({
                scripts: {
                    'foo-bar-baz': '',
                    'foo--baz': '',
                },
            });

            expect(parser.parse(createCommandInfo(`${npmCmd} run foo-*-baz qux`))).toEqual([
                { name: 'bar', command: `${npmCmd} run foo-bar-baz qux` },
                { name: '', command: `${npmCmd} run foo--baz qux` },
            ]);
        });

        it('uses existing command name as prefix to the wildcard match', () => {
            readPkg.mockReturnValue({
                scripts: {
                    'watch-js': '',
                    'watch-css': '',
                },
            });

            expect(parser.parse({
                name: 'w:',
                command: `${npmCmd} run watch-*`,
            })).toEqual([
                { name: 'w:js', command: `${npmCmd} run watch-js` },
                { name: 'w:css', command: `${npmCmd} run watch-css` },
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

            expect(parser.parse(createCommandInfo(`${npmCmd} run lint:*(!fix)`))).toEqual([
                { name: 'js', command: `${npmCmd} run lint:js` },
                { name: 'ts', command: `${npmCmd} run lint:ts` },
            ]);
        });

        it('caches scripts upon calls', () => {
            readPkg.mockReturnValue({});
            parser.parse(createCommandInfo(`${npmCmd} run foo-*-baz qux`));
            parser.parse(createCommandInfo(`${npmCmd} run foo-*-baz qux`));

            expect(readPkg).toHaveBeenCalledTimes(1);
        });
    });
}
