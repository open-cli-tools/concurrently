declare module "concurrently" {

    export interface Options {
        // Kill other processes if one dies
        killOthers?: boolean,

        // Kill other processes if one exits with non zero status code
        killOthersOnFail?: boolean,

        // Return success or failure of the 'first' child to terminate, the 'last' child,
        // or succeed only if 'all' children succeed
        success?: 'first' | 'last' | 'all',

        // Prefix logging with pid
        prefix?: '' | 'pid' | 'none' | 'time' | 'command' | 'index' | 'name',

        // moment/date-fns format
        timestampFormat?: string,

        // How many characters to display from start of command in prefix if
        // command is defined. Note that also '..' will be added in the middle
        prefixLength?: number,

        // By default, color output
        color?: boolean,

        // If true, the output will only be raw output of processes, nothing more
        raw?: boolean,

        // If true, the process restart when it exited with status code non-zero
        allowRestart?: boolean,

        // By default, restart instantly
        restartAfter?: number,

        // By default, restart once
        restartTries?: number
    }

    // see https://github.com/chalk/chalk#styles for details
    export type modifier = 'reset' | 'bold' | 'dim' | 'italic' | 'underline' | 'inverse' | 'hidden' | 'strikethrough';
    export type textColor = 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray' | 'blackBright' | 'redBright' | 'greenBright' | 'yellowBright' | 'blueBright' | 'magentaBright' | 'cyanBright' | 'whiteBright';
    export type backColor = 'bgBlack' | 'bgRed' | 'bgGreen' | 'bgYellow' | 'bgBlue' | 'bgMagenta' | 'bgCyan' | 'bgWhite' | 'bgBlackBright' | 'bgRedBright' | 'bgGreenBright' | 'bgYellowBright' | 'bgBlueBright' | 'bgMagentaBright' | 'bgCyanBright' | 'bgWhiteBright';

    export interface Command {
        name?: string,
        prefixModifier?: modifier,
        prefixTextColor?: textColor,
        prefixBackColor?: backColor,
        command: string,
    }

    export function run(commands: (string | Command)[], options?: Options): Promise<number[]>;
}
