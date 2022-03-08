import { CommandInfo } from '../command';
import { CommandParser } from './command-parser';

/**
 * Replace placeholders with additional arguments.
 */
export class ExpandArguments implements CommandParser {
    parse(commandInfo: CommandInfo) {
        const command = commandInfo.command.replace(/\\?{([@\*]|\d+)\}/g, (match, p1) => {
            if (match.startsWith('\\')) {
                return match.substring(1);
            }
            if (!isNaN(p1) && p1 > 0 && commandInfo.additionalArguments[p1-1]) {
                return `'${commandInfo.additionalArguments[p1-1]}'`;
            }
            if (p1 === '@') {
                return commandInfo.additionalArguments.map((arg) => `'${arg}'`).join(' ');
            }
            if (p1 === '*' && commandInfo.additionalArguments.length > 0) {
                return `'${commandInfo.additionalArguments.join(' ')}'`;
            }
            return '';
        });

        return Object.assign({}, commandInfo, {
            command,
        });
    }
};
