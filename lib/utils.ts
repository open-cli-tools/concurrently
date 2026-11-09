import type { CommandIdentifier } from './command.js';

/**
 * Escapes a string for use in a regular expression.
 */
export function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whether a command's output should be suppressed.
 *
 * A command is hidden when listed in `hide`, or when `show` is non-empty and the
 * command is not listed there. Matching is by name or index, same as `--hide`.
 * When both lists are set, a command is visible only if it is in `show` and not
 * in `hide`.
 */
export function shouldHideCommand(
    command: { name: string; index: number },
    hide: readonly CommandIdentifier[] = [],
    show: readonly CommandIdentifier[] = [],
): boolean {
    const matches = (ids: readonly CommandIdentifier[]) => {
        const normalized = ids.map(String);
        return normalized.includes(command.name) || normalized.includes(String(command.index));
    };

    if (matches(hide)) {
        return true;
    }

    if (show.length > 0 && !matches(show)) {
        return true;
    }

    return false;
}

type CastArrayResult<T> = T extends undefined | null ? never[] : T extends unknown[] ? T : T[];

/**
 * Casts a value to an array if it's not one.
 */
export function castArray<T = never[]>(value?: T) {
    return (Array.isArray(value) ? value : value != null ? [value] : []) as CastArrayResult<T>;
}

/**
 * Splits a string on `delimiter`, ignoring delimiters inside parentheses.
 * Trims each segment and discards empty ones.
 *
 * Examples:
 *   splitOutsideParens('red,rgb(255,0,0),blue', ',') → ['red', 'rgb(255,0,0)', 'blue']
 *   splitOutsideParens('black.bgHex(#533AFD).dim', '.') → ['black', 'bgHex(#533AFD)', 'dim']
 */
export function splitOutsideParens(input: string, delimiter: string): string[] {
    const segments: string[] = [];
    let current = '';
    let parenDepth = 0;
    for (const char of input) {
        if (char === '(') parenDepth++;
        else if (char === ')') parenDepth--;
        if (char === delimiter && parenDepth === 0) {
            const trimmed = current.trim();
            if (trimmed) segments.push(trimmed);
            current = '';
        } else {
            current += char;
        }
    }
    const trimmed = current.trim();
    if (trimmed) segments.push(trimmed);
    return segments;
}

/**
 * Error thrown when a condition is reached that should be impossible.
 */
export class UnreachableError extends Error {
    constructor(value: never) {
        super(`Unreachable condition: ${value}`);
    }
}
