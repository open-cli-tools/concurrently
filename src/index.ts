import { Readable } from 'stream';

import { assertDeprecated } from './assert';
import { CloseEvent, Command, CommandIdentifier, TimerEvent } from './command';
import {
    concurrently as createConcurrently,
    ConcurrentlyCommandInput,
    ConcurrentlyOptions as BaseConcurrentlyOptions,
    ConcurrentlyResult,
} from './concurrently';
import { FlowController } from './flow-control/flow-controller';
import { InputHandler } from './flow-control/input-handler';
import { KillOnSignal } from './flow-control/kill-on-signal';
import { KillOthers, ProcessCloseCondition } from './flow-control/kill-others';
import { LogError } from './flow-control/log-error';
import { LogExit } from './flow-control/log-exit';
import { LogOutput } from './flow-control/log-output';
import { LogTimings } from './flow-control/log-timings';
import { LoggerPadding } from './flow-control/logger-padding';
import { OutputErrorHandler } from './flow-control/output-error-handler';
import { RestartDelay, RestartProcess } from './flow-control/restart-process';
import { Teardown } from './flow-control/teardown';
import { Logger } from './logger';
import { castArray } from './utils';

export type ConcurrentlyOptions = Omit<BaseConcurrentlyOptions, 'abortSignal' | 'hide'> & {
    // Logger options
    /**
     * Which command(s) should have their output hidden.
     */
    hide?: CommandIdentifier | CommandIdentifier[];

    /**
     * The prefix format to use when logging a command's output.
     * Defaults to the command's index.
     */
    prefix?: string;

    /**
     * How many characters should a prefix have at most, used when the prefix format is `command`.
     */
    prefixLength?: number;

    /**
     * Pads short prefixes with spaces so that all prefixes have the same length.
     */
    padPrefix?: boolean;

    /**
     * Whether output should be formatted to include prefixes and whether "event" logs will be logged.
     */
    raw?: boolean;

    /**
     * Date format used when logging date/time.
     * @see https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
     */
    timestampFormat?: string;

    // Input handling options
    defaultInputTarget?: CommandIdentifier;
    inputStream?: Readable;
    handleInput?: boolean;
    pauseInputStreamOnFinish?: boolean;

    // Restarting options
    /**
     * How much time in milliseconds to wait before restarting a command.
     *
     * @see RestartProcess
     */
    restartDelay?: RestartDelay;

    /**
     * How many times commands should be restarted when they exit with a failure.
     *
     * @see RestartProcess
     */
    restartTries?: number;

    // Process killing options
    /**
     * @deprecated Use `killOthersOn` instead.
     * @see KillOthers
     */
    killOthers?: ProcessCloseCondition | ProcessCloseCondition[];
    /**
     * Once the first command exits with one of these statuses, kill other commands.
     * @see KillOthers
     */
    killOthersOn?: ProcessCloseCondition | ProcessCloseCondition[];

    /**
     * Signal to send to killed processes.
     */
    killSignal?: string;

    /**
     * How many milliseconds to wait before killing processes.
     */
    killTimeout?: number;

    // Timing options
    /**
     * Whether to output timing information for processes.
     *
     * @see LogTimings
     */
    timings?: boolean;

    /**
     * Clean up command(s) to execute before exiting concurrently.
     * These won't be prefixed and don't affect concurrently's exit code.
     */
    teardown?: readonly string[];

    /**
     * List of additional arguments passed that will get replaced in each command.
     * If not defined, no argument replacing will happen.
     */
    additionalArguments?: string[];

    /**
     * Every command will be run multiple times, for all combinations of the given arrays.
     * Each dimension is a mapping of a dimension name to its possible values.
     * Eg. `{ X: ['a', 'b'], Y: ['1', '2'] }` will run the commands 4 times.
     */
    matrices?: Record<string, string[]>;
};

export function concurrently(
    commands: ConcurrentlyCommandInput[],
    options: Partial<ConcurrentlyOptions> = {},
) {
    assertDeprecated(options.killOthers === undefined, 'killOthers', 'Use killOthersOn instead.');

    // To avoid empty strings from hiding the output of commands that don't have a name,
    // keep in the list of commands to hide only strings with some length.
    // This might happen through the CLI when no `--hide` argument is specified, for example.
    const hide = castArray(options.hide).filter((id) => id || id === 0);
    const logger =
        options.logger ||
        new Logger({
            hide,
            prefixFormat: options.prefix,
            commandLength: options.prefixLength,
            raw: options.raw,
            timestampFormat: options.timestampFormat,
        });

    if (options.prefixColors === false) {
        logger.toggleColors(false);
    }

    const abortController = new AbortController();
    const outputStream = options.outputStream || process.stdout;

    return createConcurrently(commands, {
        maxProcesses: options.maxProcesses,
        raw: options.raw,
        successCondition: options.successCondition,
        cwd: options.cwd,
        hide,
        logger,
        outputStream,
        group: options.group,
        abortSignal: abortController.signal,
        controllers: [
            // LoggerPadding needs to run before any other controllers that might output something
            ...(options.padPrefix ? [new LoggerPadding({ logger })] : []),
            new LogError({ logger }),
            new LogOutput({ logger }),
            new LogExit({ logger }),
            new InputHandler({
                logger,
                defaultInputTarget: options.defaultInputTarget,
                inputStream:
                    options.inputStream || (options.handleInput ? process.stdin : undefined),
                pauseInputStreamOnFinish: options.pauseInputStreamOnFinish,
            }),
            new KillOnSignal({ process, abortController }),
            new RestartProcess({
                logger,
                delay: options.restartDelay,
                tries: options.restartTries,
            }),
            new KillOthers({
                logger,
                conditions: options.killOthersOn || options.killOthers || [],
                timeoutMs: options.killTimeout,
                killSignal: options.killSignal,
                abortController,
            }),
            new OutputErrorHandler({ abortController, outputStream }),
            new LogTimings({
                logger: options.timings ? logger : undefined,
                timestampFormat: options.timestampFormat,
            }),
            new Teardown({ logger, spawn: options.spawn, commands: options.teardown || [] }),
        ],
        prefixColors: options.prefixColors || [],
        matrices: options.matrices,
        additionalArguments: options.additionalArguments,
    });
}

// Export all flow controllers, types, and the main concurrently function,
// so that 3rd-parties can use them however they want

// Main
export { ConcurrentlyCommandInput, ConcurrentlyResult, createConcurrently, Logger };

// Command specific
export { CloseEvent, Command, CommandIdentifier, TimerEvent };

// Flow controllers
export {
    FlowController,
    InputHandler,
    KillOnSignal,
    KillOthers,
    LogError,
    LogExit,
    LogOutput,
    LogTimings,
    RestartProcess,
};
