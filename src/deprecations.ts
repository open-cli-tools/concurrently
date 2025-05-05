const deprecations = new Set<string>();

export function deprecatedOption<T extends object>(
    object: T,
    option: Extract<keyof T, string>,
    alternative: string,
) {
    if (object[option] != null) {
        // eslint-disable-next-line no-console
        console.warn(`[concurrently] ${option} is deprecated. ${alternative}`);
        deprecations.add(option);
    }
}
