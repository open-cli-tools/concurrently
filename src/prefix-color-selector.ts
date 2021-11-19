import chalk from 'chalk';

export class PrefixColorSelector {
    lastColor: string;
    autoColors: string[];

    get ACCEPTABLE_CONSOLE_COLORS() {
        // Colors picked randomly, can be amended if required
        return (
            [
                chalk.cyan,
                chalk.yellow,
                chalk.magenta,
                chalk.grey,
                chalk.bgBlueBright,
                chalk.bgMagenta,
                chalk.magentaBright,
                chalk.bgBlack,
                chalk.bgWhite,
                chalk.bgCyan,
                chalk.bgGreen,
                chalk.bgYellow,
                chalk.bgRed,
                chalk.bgGreenBright,
                chalk.bgGrey,
                chalk.blueBright,
            ]
                // Filter out duplicates
                .filter((chalkColor, index, arr) => {
                    return arr.indexOf(chalkColor) === index;
                })
                .map(chalkColor => chalkColor.bold.toString())
        );
    }

    constructor(private readonly prefixColors?: string[], private readonly color?: boolean) {}

    getNextColor(index?: number) {
        const cannotSelectColor = !this.prefixColors?.length && !this.color;
        if (cannotSelectColor) {
            return '';
        }

        const userDefinedColorForCurrentCommand =
            this.prefixColors && typeof index === 'number' && this.prefixColors[index];

        if (!this.color) {
            // Use documented behaviour of repeating last color
            // when specifying more commands than colors
            this.lastColor = userDefinedColorForCurrentCommand || this.lastColor;
            return this.lastColor;
        }

        // User preference takes priority if defined
        if (userDefinedColorForCurrentCommand) {
            this.lastColor = userDefinedColorForCurrentCommand;
            return userDefinedColorForCurrentCommand;
        }

        // Auto selection requested and no user preference defined, select next auto color
        if (!this.autoColors || !this.autoColors.length) {
            this.refillAutoColors();
        }

        // Prevent consecutive colors from being the same
        // (i.e. when transitioning from user colours to auto colours)
        const nextColor = this.autoColors.shift();

        this.lastColor = nextColor !== this.lastColor ? nextColor : this.getNextColor();
        return this.lastColor;
    }

    refillAutoColors() {
        // Make sure auto colors are not empty after refill
        this.autoColors = [...this.ACCEPTABLE_CONSOLE_COLORS];
    }
}
