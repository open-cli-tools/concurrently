import { CommandInfo } from '../command.js';
import { getDefaultShellKind, ShellKind } from '../spawn.js';
import { CommandParser } from './command-parser.js';
import { createShellQuote } from './shell-quote.js';

/**
 * Replace placeholders with additional arguments.
 */
export class ExpandArguments implements CommandParser {
    private readonly shellKind: ShellKind;
    constructor(
        private readonly additionalArguments: string[],
        shellKind?: ShellKind,
    ) {
        this.shellKind = shellKind || getDefaultShellKind();
    }

    parse(commandInfo: CommandInfo) {
        const command = commandInfo.command.replace(
            /\\?\{([@*]|[1-9]\d*)\}/g,
            (match, placeholderTarget: string) => {
                // Don't replace the placeholder if it is escaped by a backslash.
                if (match.startsWith('\\')) {
                    return match.slice(1);
                }

                if (this.additionalArguments.length > 0) {
                    const quote = createShellQuote(this.shellKind);
                    // Replace numeric placeholder if value exists in additional arguments.
                    if (+placeholderTarget <= this.additionalArguments.length) {
                        return quote([this.additionalArguments[+placeholderTarget - 1]]);
                    }

                    // Replace all arguments placeholder.
                    if (placeholderTarget === '@') {
                        return quote(this.additionalArguments);
                    }

                    // Replace combined arguments placeholder.
                    if (placeholderTarget === '*') {
                        return quote([this.additionalArguments.join(' ')]);
                    }
                }

                // Replace placeholder with empty string
                // if value doesn't exist in additional arguments.
                return '';
            },
        );

        return { ...commandInfo, command };
    }
}
