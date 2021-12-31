import { Readable } from 'stream';
import { CommandIdentifier } from './command';
import { concurrently, ConcurrentlyCommandInput, ConcurrentlyOptions as BaseConcurrentlyOptions } from './concurrently';
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
    hide?: CommandIdentifier | CommandIdentifier[],
    prefix?: string,
    prefixLength?: number,
    raw?: boolean,
    timestampFormat?: string,

    // Input handling options
    defaultInputTarget?: CommandIdentifier,
    inputStream?: Readable,
    handleInput?: boolean,
    pauseInputStreamOnFinish?: boolean,

    // Restarting options
    restartDelay?: number,
    restartTries?: number,

    // Process killing options
    killOthers?: ProcessCloseCondition | ProcessCloseCondition[],

    // Timing options
    timings?: boolean,
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
                conditions: options.killOthers
            }),
            new LogTimings({
                logger: options.timings ? logger : null,
                timestampFormat: options.timestampFormat,
            })
        ],
        prefixColors: options.prefixColors || [],
    });
};

// Export all flow controllers and the main concurrently function,
// so that 3rd-parties can use them however they want
export {
    concurrently,
    Logger,
    InputHandler,
    KillOnSignal,
    KillOthers,
    LogError,
    LogExit,
    LogOutput,
    LogTimings,
    RestartProcess,
};
