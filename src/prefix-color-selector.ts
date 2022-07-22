import chalk from 'chalk';

function getConsoleColorsWithoutCustomColors(customColors: string[]): string[] {
    return PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS.filter(
        // consider the "Bright" variants of colors to be the same as the plain color to avoid similar colors
        color => !customColors.includes(color.replace(/Bright$/, ''))
    );
}

/**
 * Creates a generator that yields an infinite stream of colours
 */
function* createColorGenerator(customColors: string[]): Generator<string, string> {
    // custom colors should be used as is, except for "auto"
    const nextAutoColors: string[] = getConsoleColorsWithoutCustomColors(customColors);
    let lastColor: string;
    for (const customColor of customColors) {
        let currentColor = customColor;
        if (currentColor !== 'auto') {
            yield currentColor; // manual color
        } else {
            // find the first auto color that is not the same as the last color
            while (currentColor === 'auto' || lastColor === currentColor) {
                if (!nextAutoColors.length) {
                    // there could be more "auto" values than auto colors so this needs to be able to refill
                    nextAutoColors.push(...PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS);
                }
                currentColor = nextAutoColors.shift();
            }
            yield currentColor; // auto color
        }
        lastColor = currentColor;
    }

    const lastCustomColor = customColors[customColors.length - 1] || '';
    if (lastCustomColor !== 'auto') {
        while (true) {
            yield lastCustomColor; // if last custom color was not "auto" then return same color forever, to maintain existing behaviour
        }
    }

    // finish the initial set(s) of auto colors to avoid repetition
    for (const color of nextAutoColors) {
        yield color;
    }

    // yield an infinite stream of acceptable console colors
    // if the given custom colors use every ACCEPTABLE_CONSOLE_COLORS except one then there is a chance a color will be repeated,
    // however its highly unlikely and low consequence so not worth the extra complexity to account for it
    while (true) {
        for (const color of PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS) {
            yield color; // repeat colors forever
        }
    }
}

export class PrefixColorSelector {
    private colorGenerator: Generator<string, string>;

    constructor(customColors: string[] = []) {
        this.colorGenerator = createColorGenerator(customColors);
    }

    /** A list of colours that are readable in a terminal */
    public static get ACCEPTABLE_CONSOLE_COLORS() {
        // Colors picked randomly, can be amended if required
        return [
            // prevent duplicates, incase the list becomes significantly large
            ...new Set<keyof typeof chalk>([
                // text colors
                'cyan',
                'yellow',
                'greenBright',
                'blueBright',
                'magentaBright',
                'white',
                'grey',
                'red',

                // bg colors
                'bgCyan',
                'bgYellow',
                'bgGreenBright',
                'bgBlueBright',
                'bgMagenta',
                'bgWhiteBright',
                'bgGrey',
                'bgRed',
            ]),
        ];
    }

    /**
     * @returns The given custom colors then a set of acceptable console colors indefinitely
     */
    getNextColor(): string {
        return this.colorGenerator.next().value;
    }
}
