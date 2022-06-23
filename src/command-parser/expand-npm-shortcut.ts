import { CommandInfo } from '../command';
import { CommandParser } from './command-parser';

/**
 * Expands commands prefixed with `npm:`, `yarn:` or `pnpm:` into the full version `npm run <command>` and so on.
 */
export class ExpandNpmShortcut implements CommandParser {
    parse(commandInfo: CommandInfo) {
        const [, npmCmd, cmdName, args] =
            commandInfo.command.match(/^(npm|yarn|pnpm):(\S+)(.*)/) || [];
        if (!cmdName) {
            return commandInfo;
        }

        return {
            ...commandInfo,
            name: commandInfo.name || cmdName,
            command: `${npmCmd} run ${cmdName}${args}`,
        };
    }
}
