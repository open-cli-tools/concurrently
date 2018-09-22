const ExpandNpmWildcard = require('./expand-npm-wildcard');

let parser, readPkg;

beforeEach(() => {
    readPkg = jest.fn();
    parser = new ExpandNpmWildcard(readPkg);
});

it('returns same command if not an npm run command', () => {
    const commandInfo = {
        command: 'npm test'
    };

    expect(readPkg).not.toHaveBeenCalled();
    expect(parser.parse(commandInfo)).toBe(commandInfo);
});

it('returns same command if no wildcard present', () => {
    const commandInfo = {
        command: 'npm run foo bar'
    };

    expect(readPkg).not.toHaveBeenCalled();
    expect(parser.parse(commandInfo)).toBe(commandInfo);
});

it('expands to nothing if no scripts exist in package.json', () => {
    readPkg.mockReturnValue({});

    expect(parser.parse({ command: 'npm run foo-*-baz qux' })).toEqual([]);
});

it('expands to all scripts matching pattern', () => {
    readPkg.mockReturnValue({
        scripts: {
            'foo-bar-baz': '',
            'foo--baz': '',
        }
    });

    expect(parser.parse({ command: 'npm run foo-*-baz qux' })).toEqual([
        { name: 'bar', command: 'npm run foo-bar-baz qux' },
        { name: '', command: 'npm run foo--baz qux' },
    ]);
});

it('caches scripts upon calls', () => {
    readPkg.mockReturnValue({});
    parser.parse({ command: 'npm run foo-*-baz qux' });
    parser.parse({ command: 'npm run foo-*-baz qux' });

    expect(readPkg).toHaveBeenCalledTimes(1);
});

it('suffix name with wildcard values', () => {
    readPkg.mockReturnValue({
        scripts: {
            'watch-foo': '',
            'watch-bar': '',
        }
    });

    expect(parser.parse({ name: 'w:', command: 'npm run watch-*' })).toEqual([
        { name: 'w:foo', command: 'npm run watch-foo' },
        { name: 'w:bar', command: 'npm run watch-bar' },
    ]);
});
