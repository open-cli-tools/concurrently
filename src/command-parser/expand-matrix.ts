import { quote } from 'shell-quote';

import { CommandInfo } from '../command';
import { CommandParser } from './command-parser';

/**
 * Replace placeholders with new commands for each binding in the matrix expansion.
 */
export class ExpandMatrix implements CommandParser {
    /**
     * The matrix as defined by a mapping of dimension names to their possible values.
     */
    private readonly matrix: Record<string, string[]>;

    /**
     * All combinations of the matrix dimensions.
     */
    private readonly bindings: Record<string, string>[];

    constructor(matrix: Record<string, string[]>) {
        this.matrix = matrix;
        this.bindings = Array.from(combinations(matrix));
    }

    parse(commandInfo: CommandInfo) {
        return this.bindings.map((binding) => this.replacePlaceholders(commandInfo, binding));
    }

    private replacePlaceholders(
        commandInfo: CommandInfo,
        binding: Record<string, string>,
    ): CommandInfo {
        const command = commandInfo.command.replace(
            /\\?\{M:([^}]+)\}/g,
            (match, placeholderTarget) => {
                // Don't replace the placeholder if it is escaped by a backslash.
                if (match.startsWith('\\')) {
                    return match.slice(1);
                }

                if (placeholderTarget && !(placeholderTarget in this.matrix)) {
                    throw new Error(
                        `[concurrently] Matrix placeholder '{M:${placeholderTarget}}' does not match any defined matrix.`,
                    );
                }

                // Replace dimension name with binding value
                return quote([binding[placeholderTarget]]);
            },
        );

        return { ...commandInfo, command };
    }
}

/**
 * Returns all possible combinations of the given dimensions.
 *
 * @param dimensions An object where keys are dimension names and values are arrays of possible values.
 *        eg `{os: ['windows', 'linux'], env: ['dev', 'staging']}`
 */
export function* combinations(
    dimensions: Record<string, string[]>,
): Generator<Record<string, string>> {
    const buildCurBinding = (): Record<string, string> => {
        return Object.fromEntries(
            Object.entries(dimensions).map(([dimName, dimValues], i) => [
                dimName,
                dimValues[curBindingIndices[i]],
            ]),
        );
    };

    const totalDimensions = Object.keys(dimensions).length;
    const curBindingIndices = Object.values(dimensions).map(() => 0);
    const dimensionSizes = Object.values(dimensions).map((dimValues) => dimValues.length);

    // If any dimension is empty, there are no combinations.
    if (totalDimensions === 0 || dimensionSizes.some((size) => size === 0)) {
        return;
    }

    let curDimension = 0;
    while (curDimension >= 0) {
        if (curDimension === totalDimensions - 1) {
            yield buildCurBinding();

            // Exhausted last dimension, backtrack
            while (
                curDimension >= 0 &&
                curBindingIndices[curDimension] === dimensionSizes[curDimension] - 1
            ) {
                curBindingIndices[curDimension] = 0;
                curDimension--;
            }

            // All dimensions exhausted, done
            if (curDimension < 0) {
                break;
            }

            // Move to next value in current dimension
            curBindingIndices[curDimension]++;
        } else {
            curDimension++;
        }
    }
}
