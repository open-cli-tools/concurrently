import { describe, expect, it } from 'vitest';

import { CommandInfo } from '../command';
import { ExpandShortcut } from './expand-shortcut';

const parser = new ExpandShortcut();

const createCommandInfo = (command: string, name = ''): CommandInfo => ({
    name,
    command,
});

it('returns same command if no prefix is present', () => {
    const commandInfo = createCommandInfo('echo foo');
    expect(parser.parse(commandInfo)).toBe(commandInfo);
});

describe.each([
    ['npm', 'npm run'],
    ['yarn', 'yarn run'],
    ['pnpm', 'pnpm run'],
    ['bun', 'bun run'],
    ['node', 'node --run'],
    ['deno', 'deno task'],
])(`with '%s:' prefix`, (prefix, command) => {
    it(`expands to "${command} <script> <args>"`, () => {
        const commandInfo = createCommandInfo(`${prefix}:foo -- bar`, 'echo');
        expect(parser.parse(commandInfo)).toEqual({
            ...commandInfo,
            name: 'echo',
            command: `${command} foo -- bar`,
        });
    });

    it('sets name to script name if none', () => {
        const commandInfo = createCommandInfo(`${prefix}:foo -- bar`);
        expect(parser.parse(commandInfo)).toEqual({
            ...commandInfo,
            name: 'foo',
            command: `${command} foo -- bar`,
        });
    });
});
