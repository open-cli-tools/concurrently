import { quote } from 'shell-quote';

import { CommandInfo } from '../command';
import { CommandParser } from './command-parser';

/**
 * Replace placeholders with new commands for each combination of matrices.
 */
export class ExpandMatrices implements CommandParser {
    private _bindings: string[][];

    constructor(private readonly matrices: readonly string[][]) {
        this.matrices = matrices;
        this._bindings = combinations(matrices);
    }

    parse(commandInfo: CommandInfo) {
        return this._bindings.map((binding) => this.replacePlaceholders(commandInfo, binding));
    }

    private replacePlaceholders(commandInfo: CommandInfo, binding: string[]): CommandInfo {
        const command = commandInfo.command.replace(
            /\\?\{([0-9]*)?\}/g,
            (match, placeholderTarget) => {
                // Don't replace the placeholder if it is escaped by a backslash.
                if (match.startsWith('\\')) {
                    return match.slice(1);
                }

                let index = 0;
                if (placeholderTarget && !isNaN(placeholderTarget)) {
                    index = parseInt(placeholderTarget, 10) - 1;
                }

                // Replace numeric placeholder if value exists in additional arguments.
                if (index < binding.length) {
                    return quote([binding[index]]);
                }

                // Replace placeholder with empty string
                // if value doesn't exist in additional arguments.
                return '';
            },
        );

        return { ...commandInfo, command };
    }
}

/**
 * Returns all possible combinations of the given dimensions.
 */
export function combinations(dimensions: readonly string[][]): string[][] {
    return dimensions.reduce(
        (acc, dimension) => {
            return acc.flatMap((accItem) =>
                dimension.map((dimensionItem) => accItem.concat(dimensionItem)),
            );
        },
        [[]] as string[][],
    );
}
