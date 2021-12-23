import { CommandInfo } from '../command';
import { ExpandNpmShortcut } from './expand-npm-shortcut';
const parser = new ExpandNpmShortcut();

const createCommandInfo = (command: string, name?: string): CommandInfo => ({
    name,
    command,
});

it('returns same command if no npm: prefix is present', () => {
    const commandInfo = createCommandInfo('echo foo');
    expect(parser.parse(commandInfo)).toBe(commandInfo);
});

for (const npmCmd of ['npm', 'yarn', 'pnpm']) {
    describe(`with ${npmCmd}: prefix`, () => {
        it(`expands to "${npmCmd} run <script> <args>"`, () => {
            const commandInfo = createCommandInfo(`${npmCmd}:foo -- bar`, 'echo');
            expect(parser.parse(commandInfo)).toEqual({
                ...commandInfo,
                name: 'echo',
                command: `${npmCmd} run foo -- bar`
            });
        });

        it('sets name to script name if none', () => {
            const commandInfo = createCommandInfo(`${npmCmd}:foo -- bar`);
            expect(parser.parse(commandInfo)).toEqual({
                ...commandInfo,
                name: 'foo',
                command: `${npmCmd} run foo -- bar`
            });
        });
    });

}
