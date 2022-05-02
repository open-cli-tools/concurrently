import { Readable } from 'stream';
import { CloseEvent, Command, CommandIdentifier, TimerEvent } from './command';
import { concurrently, ConcurrentlyCommandInput, ConcurrentlyOptions as BaseConcurrentlyOptions, ConcurrentlyResult } from './concurrently';
import { FlowController } from './flow-control/flow-controller';
import { InputHandler } from './flow-control/input-handler';
import { KillOnSignal } from './flow-control/kill-on-signal';
import { KillOthers, ProcessCloseCondition } from './flow-control/kill-others';
import { LogError } from './flow-control/log-error';
import { LogExit } from './flow-control/log-exit';
import { LogOutput } from './flow-control/log-output';
import { LogTimings } from './flow-control/log-timings';
import { RestartProcess } from './flow-control/restart-process';
import { Logger } from './logger';

export type ConcurrentlyOptions = BaseConcurrentlyOptions & {
    // Logger options
    /**
     * Which command(s) should have their output hidden.
     */
    hide?: CommandIdentifier | CommandIdentifier[],

    /**
     * The prefix format to use when logging a command's output.
     * Defaults to the command's index.
     */
    prefix?: string,

    /**
     * How many characters should a prefix have at most, used when the prefix format is `command`.
     */
    prefixLength?: number,

    /**
     * Whether output should be formatted to include prefixes and whether "event" logs will be logged.
     */
    raw?: boolean,

    /**
     * Date format used when logging date/time.
     * @see https://date-fns.org/v2.0.1/docs/format
     */
    timestampFormat?: string,

    // Input handling options
    defaultInputTarget?: CommandIdentifier,
    inputStream?: Readable,
    handleInput?: boolean,
    pauseInputStreamOnFinish?: boolean,

    // Restarting options
    /**
     * How much time in milliseconds to wait before restarting a command.
     *
     * @see RestartProcess
     */
    restartDelay?: number,

    /**
     * How many times commands should be restarted when they exit with a failure.
     *
     * @see RestartProcess
     */
    restartTries?: number,

    // Process killing options
    /**
     * Under which condition(s) should other commands be killed when the first one exits.
     *
     * @see KillOthers
     */
    killOthers?: ProcessCloseCondition | ProcessCloseCondition[],

    // Timing options
    /**
     * Whether to output timing information for processes.
     *
     * @see LogTimings
     */
    timings?: boolean,

    /**
     * List of additional arguments passed that will get replaced in each command.
     * If not defined, no argument replacing will happen.
     */
    additionalArguments?: string[],
};

export default (commands: ConcurrentlyCommandInput[], options: Partial<ConcurrentlyOptions> = {}) => {
    const logger = new Logger({
        hide: options.hide,
        prefixFormat: options.prefix,
        prefixLength: options.prefixLength,
        raw: options.raw,
        timestampFormat: options.timestampFormat,
    });

    return concurrently(commands, {
        maxProcesses: options.maxProcesses,
        raw: options.raw,
        successCondition: options.successCondition,
        cwd: options.cwd,
        logger,
        outputStream: options.outputStream || process.stdout,
        group: options.group,
        controllers: [
            new LogError({ logger }),
            new LogOutput({ logger }),
            new LogExit({ logger }),
            new InputHandler({
                logger,
                defaultInputTarget: options.defaultInputTarget,
                inputStream: options.inputStream || (options.handleInput && process.stdin),
                pauseInputStreamOnFinish: options.pauseInputStreamOnFinish,
            }),
            new KillOnSignal({ process }),
            new RestartProcess({
                logger,
                delay: options.restartDelay,
                tries: options.restartTries,
            }),
            new KillOthers({
                logger,
                conditions: options.killOthers,
            }),
            new LogTimings({
                logger: options.timings ? logger : null,
                timestampFormat: options.timestampFormat,
            }),
        ],
        prefixColors: options.prefixColors || [],
        additionalArguments: options.additionalArguments,
    });
};

// Export all flow controllers, types, and the main concurrently function,
// so that 3rd-parties can use them however they want
export {
    concurrently,
    ConcurrentlyCommandInput,
    ConcurrentlyResult,
    Logger,

    // Command specific
    Command,
    CloseEvent,
    TimerEvent,
    CommandIdentifier,

    // Flow controllers
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
