const ZZ_ExpandArguments = require('./zz-expand-arguments');
const parser = new ZZ_ExpandArguments();

it('noop if no argPend', () => {
    const commandInfo = {
        command: 'foo bar'
    };
    expect(parser.parse(commandInfo).command)
        .toEqual('foo bar');
});

it('noop if empty argPend', () => {
    const commandInfo = {
        command: 'foo bar',
        argPend: {}
    };
    expect(parser.parse(commandInfo).command)
        .toEqual('foo bar');
});

it('argPend prepend', () => {
    const commandInfo = {
        command: 'foo bar',
        argPend: { prepend: 'echo' },
    };
    expect(parser.parse(commandInfo).command)
        .toEqual('echo foo bar');
});

it('argPend append', () => {
    const commandInfo = {
        command: 'foo bar',
        argPend: { append: '--watch' },
    };
    expect(parser.parse(commandInfo).command)
        .toEqual('foo bar --watch');
});

it('argPend prepend + append', () => {
    const commandInfo = {
        command: 'foo bar',
        argPend: { prepend: 'echo', append: '--watch' },
    };
    expect(parser.parse(commandInfo).command)
        .toEqual('echo foo bar --watch');
});
