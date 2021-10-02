import { Command } from '../command';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';

interface LogErrorParams {
    logger: Logger;
}

export class LogError implements FlowController {
    private readonly logger: Logger;

    constructor({ logger }: LogErrorParams) {
        this.logger = logger;
    }

    handle(commands: Command[]) {
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
