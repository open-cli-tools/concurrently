import { CommandInfo } from '../command';
import { CommandParser } from './command-parser';

/**
 * Expands commands prefixed with `node:`, `npm:`, `yarn:`, `pnpm:`, or `bun:` into the full version `npm run <command>` and so on.
 */
export class ExpandNpmShortcut implements CommandParser {
    parse(commandInfo: CommandInfo) {
        const [, npmCmd, cmdName, args] =
            commandInfo.command.match(/^(node|npm|yarn|pnpm|bun):(\S+)(.*)/) || [];
        if (!cmdName) {
            return commandInfo;
        }

        const runCmd = npmCmd === 'node' ? '--run' : 'run';
        return {
            ...commandInfo,
            name: commandInfo.name || cmdName,
            command: `${npmCmd} ${runCmd} ${cmdName}${args}`,
        };
    }
}
