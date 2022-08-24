import { Command } from '../command.js';
import { Logger } from '../logger.js';
import { FlowController } from './flow-controller.js';

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
                    command
                );
            })
        );

        return { commands };
    }
}
