import { InputHandler } from './src/flow-control/input-handler';
import { KillOnSignal } from './src/flow-control/kill-on-signal';
import { KillOthers } from './src/flow-control/kill-others';
import { LogError } from './src/flow-control/log-error';
import { LogExit } from './src/flow-control/log-exit';
import { LogOutput } from './src/flow-control/log-output';
import { RestartProcess } from './src/flow-control/restart-process';

import { concurrently } from './src/concurrently';
import { Logger } from './src/logger';

export default function(commands, options = {}) {
    const logger = new Logger({
        hide: options.hide,
        outputStream: options.outputStream || process.stdout,
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
            })
        ],
        prefixColors: options.prefixColors || []
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
    RestartProcess
};
