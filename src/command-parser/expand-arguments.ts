import { CommandInfo } from '../command';
import { CommandParser } from './command-parser';

/**
 * Replace placeholders with passthrough arguments.
 */
export class ExpandArguments implements CommandParser {
    parse(commandInfo: CommandInfo) {
        const command = commandInfo.command.replace(/\\?{([@\*]|\d+)\}/g, (match, p1) => {
            if (match.startsWith('\\')) {
                return match.substring(1);
            }
            if (!isNaN(p1) && p1 > 0 && commandInfo.passthroughArgs[p1-1]) {
                return `'${commandInfo.passthroughArgs[p1-1]}'`;
            }
            if (p1 === '@') {
                return commandInfo.passthroughArgs.map((arg) => `'${arg}'`).join(' ');
            }
            if (p1 === '*' && commandInfo.passthroughArgs.length > 0) {
                return `'${commandInfo.passthroughArgs.join(' ')}'`;
            }
            return '';
        });

        return Object.assign({}, commandInfo, {
            command,
        });
    }
};
