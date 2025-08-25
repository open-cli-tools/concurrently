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
