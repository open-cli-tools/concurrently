import { CommandInfo } from '../command.js';
import { CommandParser } from './command-parser.js';

/**
 * Strips quotes around commands so that they can run on the current shell.
 */
export class StripQuotes implements CommandParser {
    parse(commandInfo: CommandInfo) {
        let { command } = commandInfo;

        // Removes the quotes surrounding a command.
        if (/^"(.+?)"$/.test(command) || /^'(.+?)'$/.test(command)) {
            command = command.slice(1, command.length - 1);
        }

        return { ...commandInfo, command };
    }
}
