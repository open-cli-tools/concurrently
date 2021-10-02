import _ from 'lodash';
import { filter, map } from 'rxjs/operators';

import { Logger } from '../logger';
import { FlowController } from './flow-controller';

export type KillOthersCondition = 'failure' | 'success';

interface KillOthersParams {
    logger: Logger;
    conditions: KillOthersCondition | KillOthersCondition[]
}

export class KillOthers implements FlowController {
    private readonly logger: Logger;
    private readonly conditions: KillOthersCondition[];

    constructor({ logger, conditions }: KillOthersParams) {
        this.logger = logger;
        this.conditions = _.castArray(conditions);
    }

    handle(commands) {
        const conditions = this.conditions.filter(condition => (
            condition === 'failure' ||
            condition === 'success'
        ));

        if (!conditions.length) {
            return { commands };
        }

        const closeStates = commands.map(command => command.close.pipe(
            map(({ exitCode }) => exitCode === 0 ? 'success' : 'failure'),
            filter(state => conditions.includes(state))
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
