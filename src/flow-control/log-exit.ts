import { Command } from '../command';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';

/**
 * Logs the exit code/signal of commands.
 */
export class LogExit implements FlowController {
    private readonly logger: Logger;

    constructor({ logger }: { logger: Logger }) {
        this.logger = logger;
    }

    handle(commands: Command[]) {
        commands.forEach((command) =>
            command.close.subscribe(({ exitCode }) => {
                this.logger.logCommandEvent(
                    `${command.command} exited with code ${exitCode}`,
                    command,
                );
            }),
        );

        return { commands };
    }
}
