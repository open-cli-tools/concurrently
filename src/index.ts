import _ from 'lodash';
import { Readable } from 'stream';

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
import { RestartDelay, RestartProcess } from './flow-control/restart-process';
import { Logger } from './logger';

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
     * @see https://date-fns.org/v2.0.1/docs/format
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
     * Under which condition(s) should other commands be killed when the first one exits.
     *
     * @see KillOthers
     */
    killOthers?: ProcessCloseCondition | ProcessCloseCondition[];

    // Timing options
    /**
     * Whether to output timing information for processes.
     *
     * @see LogTimings
     */
    timings?: boolean;

    /**
     * List of additional arguments passed that will get replaced in each command.
     * If not defined, no argument replacing will happen.
     */
    additionalArguments?: string[];
};

export function concurrently(
    commands: ConcurrentlyCommandInput[],
    options: Partial<ConcurrentlyOptions> = {},
) {
    // To avoid empty strings from hiding the output of commands that don't have a name,
    // keep in the list of commands to hide only strings with some length.
    // This might happen through the CLI when no `--hide` argument is specified, for example.
    const hide = _.castArray(options.hide).filter((id) => id || id === 0);
    const logger = new Logger({
        hide,
        prefixFormat: options.prefix,
        commandLength: options.prefixLength,
        raw: options.raw,
        timestampFormat: options.timestampFormat,
    });

    const abortController = new AbortController();

    return createConcurrently(commands, {
        maxProcesses: options.maxProcesses,
        raw: options.raw,
        successCondition: options.successCondition,
        cwd: options.cwd,
        hide,
        logger,
        outputStream: options.outputStream || process.stdout,
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
                conditions: options.killOthers || [],
                killSignal: options.killSignal,
                abortController,
            }),
            new LogTimings({
                logger: options.timings ? logger : undefined,
                timestampFormat: options.timestampFormat,
            }),
        ],
        prefixColors: options.prefixColors || [],
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
