/**
 * Escapes a string for use in a regular expression.
 */
export function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Casts a value to an array if it's not one.
 */
export function castArray<T>(value?: T | readonly T[]): readonly T[] {
    return Array.isArray(value) ? value : value ? [value as T] : [];
}
