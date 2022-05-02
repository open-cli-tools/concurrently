import { CommandInfo } from '../command';
import { CommandParser } from './command-parser';
import { quote } from 'shell-quote';

/**
 * Replace placeholders with additional arguments.
 */
export class ExpandArguments implements CommandParser {
    constructor(private readonly additionalArguments: string[]) {
    }

    parse(commandInfo: CommandInfo) {
        const command = commandInfo.command.replace(/\\?{([@\*]|\d+)\}/g, (match, placeholderTarget) => {
            // Don't replace the placeholder if it is escaped by a backslash.
            if (match.startsWith('\\')) {
                return match.substring(1);
            }
            if (!isNaN(placeholderTarget) && placeholderTarget > 0 && placeholderTarget <= this.additionalArguments.length) {
                return quote([this.additionalArguments[placeholderTarget-1]]);
            }
            if (placeholderTarget === '@') {
                return quote(this.additionalArguments);
            }
            if (placeholderTarget === '*') {
                return quote([this.additionalArguments.join(' ')]);
            }
            return '';
        });

        return Object.assign({}, commandInfo, {
            command,
        });
    }
};
