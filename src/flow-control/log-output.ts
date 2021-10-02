import { Command } from '../command';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';

interface LogOutputParams {
    logger: Logger;
}
export class LogOutput implements FlowController {
    private readonly logger: Logger;
    constructor({ logger }: LogOutputParams) {
        this.logger = logger;
    }

    handle(commands: Command[]) {
        commands.forEach(command => {
            command.stdout.subscribe(text => this.logger.logCommandText(text.toString(), command));
            command.stderr.subscribe(text => this.logger.logCommandText(text.toString(), command));
        });

        return { commands };
    }
};
