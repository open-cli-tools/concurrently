import { of } from 'rxjs';

import * as BaseHandler from './base-handler';

export class LogExit extends BaseHandler {
    handle(commands) {
        commands.forEach(command => command.error.subscribe(event => {
            this.logger.logCommandEvent(
                `Error occurred when executing command: ${command.command}`,
                command
            );

            this.logger.logCommandEvent(event.stack || event, command);
        }));

        return { commands };
    }
};
