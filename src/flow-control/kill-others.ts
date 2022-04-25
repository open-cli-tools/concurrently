import { Command } from '../command';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';

import _ from 'lodash';
import { filter, map } from 'rxjs/operators';

export type ProcessCloseCondition = 'failure' | 'success';

/**
 * Sends a SIGTERM signal to all commands when one of the exits with a matching condition.
 */
export class KillOthers implements FlowController {
    private readonly logger: Logger;
    private readonly conditions: ProcessCloseCondition[];

    constructor({ logger, conditions }: {
        logger: Logger,
        conditions: ProcessCloseCondition | ProcessCloseCondition[]
    }) {
        this.logger = logger;
        this.conditions = _.castArray(conditions);
    }

    handle(commands: Command[]) {
        const conditions = this.conditions.filter(condition => (
            condition === 'failure' ||
            condition === 'success'
        ));

        if (!conditions.length) {
            return { commands };
        }

        const closeStates = commands.map(command => command.close.pipe(
            map(({ exitCode }) => exitCode === 0 ? 'success' as const : 'failure' as const),
            filter(state => conditions.includes(state)),
        ));

        closeStates.forEach(closeState => closeState.subscribe(() => {
            const killableCommands = commands.filter(command => command.killable);
            if (killableCommands.length) {
                this.logger.logGlobalEvent('Sending SIGTERM to other processes..');
                killableCommands.forEach(command => command.kill());
            }
        }));

        return { commands };
    }
};
