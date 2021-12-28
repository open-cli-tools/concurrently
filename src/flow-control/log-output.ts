import { Command } from "../command";
import Logger from "../logger";
import { FlowController } from "./flow-controller";

export class LogOutput implements FlowController {
    private readonly logger: Logger;
    constructor({ logger }: { logger: Logger }) {
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
