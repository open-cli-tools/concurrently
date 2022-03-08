import { CommandInfo } from '../command';
import { ExpandArguments } from './expand-arguments';

const parser = new ExpandArguments();

const createCommandInfo = (command: string, additionalArguments: string[]): CommandInfo => ({
    command,
    name: '',
    additionalArguments,
});

it('returns command as is when no placeholders', () => {
    const commandInfo = createCommandInfo('echo foo', ['foo', 'bar']);
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo foo' });
});

it('single argument placeholder is replaced', () => {
    const commandInfo = createCommandInfo('echo {1}', ['foo', 'bar']);
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo \'foo\'' });
});

it('multiple single argument placeholders are replaced', () => {
    const commandInfo = createCommandInfo('echo {2} {1}', ['foo', 'bar']);
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo \'bar\' \'foo\'' });
});

it('empty replacement with single placeholder and no passthrough arguments', () => {
    const commandInfo = createCommandInfo('echo {3}', ['foo', 'bar']);
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo ' });
});

it('empty replacement with all placeholder and no passthrough arguments', () => {
    const commandInfo = createCommandInfo('echo {@}', []);
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo ' });
});

it('empty replacement with combined placeholder and no passthrough arguments', () => {
    const commandInfo = createCommandInfo('echo {*}', []);
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo ' });
});

it('all arguments placeholder is replaced', () => {
    const commandInfo = createCommandInfo('echo {@}', ['foo', 'bar']);
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo \'foo\' \'bar\'' });
});

it('combined arguments placeholder is replaced', () => {
    const commandInfo = createCommandInfo('echo {*}', ['foo', 'bar']);
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo \'foo bar\'' });
});

it('escaped argument placeholders are not replaced', () => {
    // Equals to single backslash on command line
    const commandInfo = createCommandInfo('echo \\{1} \\{@} \\{*}', ['foo', 'bar']);
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo {1} {@} {*}' });
});
