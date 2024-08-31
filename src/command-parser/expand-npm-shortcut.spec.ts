import { CommandInfo } from '../command';
import { ExpandNpmShortcut } from './expand-npm-shortcut';

const parser = new ExpandNpmShortcut();

const createCommandInfo = (command: string, name = ''): CommandInfo => ({
    name,
    command,
});

it('returns same command if no npm: prefix is present', () => {
    const commandInfo = createCommandInfo('echo foo');
    expect(parser.parse(commandInfo)).toBe(commandInfo);
});

describe.each([
    ['npm', 'run'],
    ['yarn', 'run'],
    ['pnpm', 'run'],
    ['bun', 'run'],
    ['node', '--run'],
])(`with %s: prefix`, (npmCmd, runCmd) => {
    it(`expands to "${npmCmd} ${runCmd} <script> <args>"`, () => {
        const commandInfo = createCommandInfo(`${npmCmd}:foo -- bar`, 'echo');
        expect(parser.parse(commandInfo)).toEqual({
            ...commandInfo,
            name: 'echo',
            command: `${npmCmd} ${runCmd} foo -- bar`,
        });
    });

    it('sets name to script name if none', () => {
        const commandInfo = createCommandInfo(`${npmCmd}:foo -- bar`);
        expect(parser.parse(commandInfo)).toEqual({
            ...commandInfo,
            name: 'foo',
            command: `${npmCmd} ${runCmd} foo -- bar`,
        });
    });
});
