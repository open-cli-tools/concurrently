import { ChalkInstance } from 'chalk';

function getConsoleColorsWithoutCustomColors(customColors: string[]): string[] {
    return PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS.filter(
        // Consider the "Bright" variants of colors to be the same as the plain color to avoid similar colors
        (color) => !customColors.includes(color.replace(/Bright$/, '')),
    );
}

/**
 * Creates a generator that yields an infinite stream of colors.
 */
function* createColorGenerator(customColors: string[]): Generator<string, string> {
    // Custom colors should be used as is, except for "auto"
    const nextAutoColors: string[] = getConsoleColorsWithoutCustomColors(customColors);
    let lastColor: string | undefined;
    for (const customColor of customColors) {
        let currentColor = customColor;
        if (currentColor !== 'auto') {
            yield currentColor; // Manual color
        } else {
            // Find the first auto color that is not the same as the last color
            while (currentColor === 'auto' || lastColor === currentColor) {
                if (!nextAutoColors.length) {
                    // There could be more "auto" values than auto colors so this needs to be able to refill
                    nextAutoColors.push(...PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS);
                }
                currentColor = String(nextAutoColors.shift());
            }
            yield currentColor; // Auto color
        }
        lastColor = currentColor;
    }

    const lastCustomColor = customColors[customColors.length - 1] || '';
    if (lastCustomColor !== 'auto') {
        while (true) {
            yield lastCustomColor; // If last custom color was not "auto" then return same color forever, to maintain existing behavior
        }
    }

    // Finish the initial set(s) of auto colors to avoid repetition
    for (const color of nextAutoColors) {
        yield color;
    }

    // Yield an infinite stream of acceptable console colors
    //
    // If the given custom colors use every ACCEPTABLE_CONSOLE_COLORS except one then there is a chance a color will be repeated,
    // however its highly unlikely and low consequence so not worth the extra complexity to account for it
    while (true) {
        for (const color of PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS) {
            yield color; // Repeat colors forever
        }
    }
}

export class PrefixColorSelector {
    private colorGenerator: Generator<string, string>;

    constructor(customColors: string | string[] = []) {
        const normalizedColors = typeof customColors === 'string' ? [customColors] : customColors;
        this.colorGenerator = createColorGenerator(normalizedColors);
    }

    /**
     * Colors used by `auto` selection and default cycling.
     *
     * Each color is chosen to be visually distinct on both dark and light
     * terminal backgrounds, without carrying semantic meaning (e.g. red
     * implies errors) or blending into default text (e.g. white/grey).
     * Background colors are excluded to keep output lightweight.
     *
     * This list does NOT restrict manually specified colors — any valid Chalk
     * color name, hex value, or modifier can be passed via `--prefix-colors`.
     */
    public static get ACCEPTABLE_CONSOLE_COLORS() {
        return [...new Set<keyof ChalkInstance>(['cyan', 'magenta', 'green', 'yellow', 'blue'])];
    }

    /**
     * @returns The given custom colors then a set of acceptable console colors indefinitely.
     */
    getNextColor(): string {
        return this.colorGenerator.next().value.trim();
    }
}
