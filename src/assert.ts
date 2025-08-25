const deprecations = new Set<string>();

/**
 * Asserts that some condition is true, and if not, prints a warning about it being deprecated.
 * The message is printed only once.
 */
export function assertDeprecated(check: boolean, name: string, message: string) {
    if (!check && !deprecations.has(name)) {
        // eslint-disable-next-line no-console
        console.warn(`[concurrently] ${name} is deprecated. ${message}`);
        deprecations.add(name);
    }
}
