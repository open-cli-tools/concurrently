/**
 * Escapes a string for use in a regular expression.
 */
export function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
