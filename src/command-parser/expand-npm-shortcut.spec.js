const ExpandNpmShortcut = require('./expand-npm-shortcut');
const parser = new ExpandNpmShortcut();

it('returns same command if no npm: prefix is present', () => {
    const commandInfo = {
        name: 'echo',
        command: 'echo foo'
    };
    expect(parser.parse(commandInfo)).toBe(commandInfo);
});

describe('with npm: prefix', () => {
    it('expands to "npm run <script> <args>"', () => {
        const commandInfo = {
            name: 'echo',
            command: 'npm:foo -- bar'
        };
        expect(parser.parse(commandInfo)).toEqual({
            name: 'echo',
            command: 'npm run foo -- bar'
        });
    });

    it('sets name to script name if none', () => {
        const commandInfo = {
            command: 'npm:foo -- bar'
        };
        expect(parser.parse(commandInfo)).toEqual({
            name: 'foo',
            command: 'npm run foo -- bar'
        });
    });
});
