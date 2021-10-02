import { Command } from '../command';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';

interface LogExitParams {
    logger: Logger;
}

export class LogExit implements FlowController {
    private readonly logger: Logger;

    constructor({ logger }: LogExitParams) {
        this.logger = logger;
    }

    handle(commands: Command[]) {
        commands.forEach(command => command.close.subscribe(({ exitCode }) => {
            this.logger.logCommandEvent(`${command.command} exited with code ${exitCode}`, command);
        }));

        return { commands };
    }
};
