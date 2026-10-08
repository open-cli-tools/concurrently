import { Command } from '../command.js';
import { Logger } from '../logger.js';
import { FlowController } from './flow-controller.js';

/**
 * Logs the exit code/signal of commands.
 */
export class LogExit implements FlowController {
    private readonly logger: Logger;
    private readonly isShuttingDown?: () => boolean;

    constructor({
        logger,
        isShuttingDown,
    }: {
        logger: Logger;
        /**
         * When set, close events are not logged while it returns true.
         * Used to silence the expected per-command exit noise after the user
         * initiated a shutdown with a signal (e.g. Ctrl-C): those late log lines
         * can otherwise land on the shell prompt after the terminal is reclaimed.
         *
         * @see https://github.com/open-cli-tools/concurrently/issues/255
         */
        isShuttingDown?: () => boolean;
    }) {
        this.logger = logger;
        this.isShuttingDown = isShuttingDown;
    }

    handle(commands: Command[]) {
        commands.forEach((command) =>
            command.close.subscribe(({ exitCode }) => {
                if (this.isShuttingDown?.()) {
                    return;
                }
                this.logger.logCommandEvent(
                    `${command.command} exited with code ${exitCode}`,
                    command,
                );
            }),
        );

        return { commands };
    }
}
