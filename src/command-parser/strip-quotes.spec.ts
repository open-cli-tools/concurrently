import { expect, it } from 'vitest';

import { CommandInfo } from '../command';
import { StripQuotes } from './strip-quotes';

const parser = new StripQuotes();

const createCommandInfo = (command: string): CommandInfo => ({
    command,
    name: '',
});

it('returns command as is if no single/double quote at the beginning', () => {
    const commandInfo = createCommandInfo('echo foo');
    expect(parser.parse(commandInfo)).toEqual(commandInfo);
});

it('strips single quotes', () => {
    const commandInfo = createCommandInfo("'echo foo'");
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo foo' });
});

it('strips double quotes', () => {
    const commandInfo = createCommandInfo('"echo foo"');
    expect(parser.parse(commandInfo)).toEqual({ ...commandInfo, command: 'echo foo' });
});

it('does not remove quotes if they are unbalanced', () => {
    let commandInfo = createCommandInfo('"echo foo');
    expect(parser.parse(commandInfo)).toEqual(commandInfo);

    commandInfo = createCommandInfo("echo foo'");
    expect(parser.parse(commandInfo)).toEqual(commandInfo);

    commandInfo = createCommandInfo('"echo foo\'');
    expect(parser.parse(commandInfo)).toEqual(commandInfo);
});
