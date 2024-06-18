import process from 'node:process';

import { CommandInfo } from '../command';
import { ExpandArguments } from './expand-arguments';

const isWin32 = process.platform === 'win32';

const createCommandInfo = (command: string): CommandInfo => ({
    command,
    name: '',
});

it('returns command as is when no placeholders', () => {
    const parser = new ExpandArguments(['foo', 'bar']);
    const commandInfo = createCommandInfo('echo foo');
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo foo' });
});

it('single argument placeholder is replaced', () => {
    const parser = new ExpandArguments(['foo', 'bar']);
    const commandInfo = createCommandInfo('echo {1}');
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo foo' });
});

it('argument placeholder is replaced and quoted properly', () => {
    const parser = new ExpandArguments(['foo bar']);
    const commandInfo = createCommandInfo('echo {1}');
    expect(parser.parse(commandInfo)).toEqual({
        ...commandInfo,
        command: isWin32 ? 'echo "foo bar"' : "echo 'foo bar'",
    });
});

it('multiple single argument placeholders are replaced', () => {
    const parser = new ExpandArguments(['foo', 'bar']);
    const commandInfo = createCommandInfo('echo {2} {1}');
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo bar foo' });
});

it('empty replacement with single placeholder and not enough passthrough arguments', () => {
    const parser = new ExpandArguments(['foo', 'bar']);
    const commandInfo = createCommandInfo('echo {3}');
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo ' });
});

it('empty replacement with all placeholder and no passthrough arguments', () => {
    const parser = new ExpandArguments([]);
    const commandInfo = createCommandInfo('echo {@}');
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo ' });
});

it('empty replacement with combined placeholder and no passthrough arguments', () => {
    const parser = new ExpandArguments([]);
    const commandInfo = createCommandInfo('echo {*}');
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo ' });
});

it('all arguments placeholder is replaced', () => {
    const parser = new ExpandArguments(['foo', 'bar']);
    const commandInfo = createCommandInfo('echo {@}');
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo foo bar' });
});

it('combined arguments placeholder is replaced', () => {
    const parser = new ExpandArguments(['foo', 'bar']);
    const commandInfo = createCommandInfo('echo {*}');
    expect(parser.parse(commandInfo)).toEqual({
        ...commandInfo,
        command: isWin32 ? 'echo "foo bar"' : "echo 'foo bar'",
    });
});

it('escaped argument placeholders are not replaced', () => {
    const parser = new ExpandArguments(['foo', 'bar']);
    // Equals to single backslash on command line
    const commandInfo = createCommandInfo('echo \\{1} \\{@} \\{*}');
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo {1} {@} {*}' });
});
