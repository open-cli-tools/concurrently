import { getShellConfigurationSync, quote } from '@cepharum/quoting-db';

import { CommandInfo } from '../command';
import { CommandParser } from './command-parser';

/**
 * Replace placeholders with additional arguments.
 */
export class ExpandArguments implements CommandParser {
    constructor(private readonly additionalArguments: string[]) {}

    parse(commandInfo: CommandInfo) {
        const configuration = getShellConfigurationSync();

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
                    return quote(this.additionalArguments[placeholderTarget - 1], configuration);
                }
                // Replace all arguments placeholder.
                if (placeholderTarget === '@') {
                    return this.additionalArguments
                        .map((arg: string) => quote(arg, configuration))
                        .join(' ');
                }
                // Replace combined arguments placeholder.
                if (placeholderTarget === '*') {
                    return quote(this.additionalArguments.join(' '), configuration);
                }
                // Replace placeholder with empty string
                // if value doesn't exist in additional arguments.
                return '';
            },
        );

        return { ...commandInfo, command };
    }
}
