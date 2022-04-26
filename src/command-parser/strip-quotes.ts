import { CommandInfo } from '../command';
import { CommandParser } from './command-parser';

/**
 * Strips quotes around commands so that they can run on the current shell.
 */
export class StripQuotes implements CommandParser {
    parse(commandInfo: CommandInfo) {
        let { command } = commandInfo;

        // Removes the quotes surrounding a command.
        if (/^"(.+?)"$/.test(command) || /^'(.+?)'$/.test(command)) {
            command = command.substring(1, command.length - 1);
        }

        return Object.assign({}, commandInfo, { command });
    }
};
