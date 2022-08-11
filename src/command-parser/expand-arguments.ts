import { quote } from 'shell-quote';

import { CommandInfo } from '../command';
import { CommandParser } from './command-parser';

/**
 * Replace placeholders with additional arguments.
 */
export class ExpandArguments implements CommandParser {
    constructor(private readonly additionalArguments: string[]) {}

    parse(commandInfo: CommandInfo) {
        const command = commandInfo.command.replace(
            /\\?\{([@*]|[1-9][0-9]*)\}/g,
            (match, placeholderTarget) => {
                // Don't replace the placeholder if it is escaped by a backslash.
                if (match.startsWith('\\')) {
                    return match.slice(1);
                }
                // Replace numeric placeholder if value exists in additional arguments.
                if (
                    !isNaN(placeholderTarget) &&
                    placeholderTarget <= this.additionalArguments.length
                ) {
                    return quote([this.additionalArguments[placeholderTarget - 1]]);
                }
                // Replace all arguments placeholder.
                if (placeholderTarget === '@') {
                    return quote(this.additionalArguments);
                }
                // Replace combined arguments placeholder.
                if (placeholderTarget === '*') {
                    return quote([this.additionalArguments.join(' ')]);
                }
                // Replace placeholder with empty string
                // if value doesn't exist in additional arguments.
                return '';
            }
        );

        return { ...commandInfo, command };
    }
}
