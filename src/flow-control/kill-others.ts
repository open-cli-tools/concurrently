import { filter, map } from 'rxjs/operators';

import { Command } from '../command';
import { Logger } from '../logger';
import { castArray } from '../utils';
import { FlowController } from './flow-controller';

export type ProcessCloseCondition = 'failure' | 'success';

/**
 * Sends a SIGTERM signal to all commands when one of the commands exits with a matching condition.
 */
export class KillOthers implements FlowController {
    private readonly logger: Logger;
    private readonly abortController?: AbortController;
    private readonly conditions: ProcessCloseCondition[];
    private readonly killSignal: string | undefined;
    private readonly timeoutMs?: number;

    constructor({
        logger,
        abortController,
        conditions,
        killSignal,
        timeoutMs,
    }: {
        logger: Logger;
        abortController?: AbortController;
        conditions: ProcessCloseCondition | ProcessCloseCondition[];
        killSignal: string | undefined;
        timeoutMs?: number;
    }) {
        this.logger = logger;
        this.abortController = abortController;
        this.conditions = castArray(conditions);
        this.killSignal = killSignal;
        this.timeoutMs = timeoutMs;
    }

    handle(commands: Command[]) {
        const conditions = this.conditions.filter(
            (condition) => condition === 'failure' || condition === 'success',
        );

        if (!conditions.length) {
            return { commands };
        }

        const closeStates = commands.map((command) =>
            command.close.pipe(
                map(({ exitCode }) =>
                    exitCode === 0 ? ('success' as const) : ('failure' as const),
                ),
                filter((state) => conditions.includes(state)),
            ),
        );

        closeStates.forEach((closeState) =>
            closeState.subscribe(() => {
                this.abortController?.abort();

                const killableCommands = commands.filter((command) => Command.canKill(command));
                if (killableCommands.length) {
                    this.logger.logGlobalEvent(
                        `Sending ${this.killSignal || 'SIGTERM'} to other processes..`,
                    );
                    killableCommands.forEach((command) => command.kill(this.killSignal));
                    this.maybeForceKill(killableCommands);
                }
            }),
        );

        return { commands };
    }

    private maybeForceKill(commands: Command[]) {
        // No need to force kill when the signal already is SIGKILL.
        if (!this.timeoutMs || this.killSignal === 'SIGKILL') {
            return;
        }

        setTimeout(() => {
            const killableCommands = commands.filter((command) => Command.canKill(command));
            if (killableCommands) {
                this.logger.logGlobalEvent(
                    `Sending SIGKILL to ${killableCommands.length} processes..`,
                );
                killableCommands.forEach((command) => command.kill('SIGKILL'));
            }
        }, this.timeoutMs);
    }
}
