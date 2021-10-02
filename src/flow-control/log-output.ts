import * as BaseHandler from './base-handler';

export class LogOutput extends BaseHandler {
    handle(commands) {
        commands.forEach(command => {
            command.stdout.subscribe(text => this.logger.logCommandText(text.toString(), command));
            command.stderr.subscribe(text => this.logger.logCommandText(text.toString(), command));
        });

        return { commands };
    }
};
