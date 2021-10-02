import * as BaseHandler from './base-handler';

export class LogExit extends BaseHandler {
    handle(commands) {
        commands.forEach(command => command.close.subscribe(({ exitCode }) => {
            this.logger.logCommandEvent(`${command.command} exited with code ${exitCode}`, command);
        }));

        return { commands };
    }
};
