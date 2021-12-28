import { Command } from '../command';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';

export class LogError implements FlowController {
    private readonly logger: Logger;

    constructor({ logger }: { logger: Logger }) {
        this.logger = logger;
    }

    handle(commands: Command[]) {
        commands.forEach(command => command.error.subscribe(event => {
            this.logger.logCommandEvent(
                `Error occurred when executing command: ${command.command}`,
                command
            );

            const errorText = String(event instanceof Error ? (event.stack || event) : event);
            this.logger.logCommandEvent(errorText, command);
        }));

        return { commands };
    }
};
