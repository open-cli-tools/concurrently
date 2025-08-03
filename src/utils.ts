/**
 * Escapes a string for use in a regular expression.
 */
export function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Casts a value to an array if it's not one.
 */
// TODO: fix the flawed type. `castArray(undefined)` returns `undefined[]`, whereas it should be `never[]`.
export function castArray<T>(value?: T | readonly T[]): T[] {
    return Array.isArray(value) ? value : value != null ? [value as T] : [];
}
