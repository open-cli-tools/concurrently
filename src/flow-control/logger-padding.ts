import { Command } from '../command';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';

export class LoggerPadding implements FlowController {
    private readonly logger: Logger;

    constructor({ logger }: { logger: Logger }) {
        this.logger = logger;
    }

    handle(commands: Command[]): { commands: Command[]; onFinish: () => void } {
        let length = 0;

        // The length of prefixes is somewhat stable, except for PIDs, which change every time a
        // process spawns (e.g. PIDs might look like 1, 10 or 100), therefore listen to command starts
        // and update the prefix length when this happens.
        const subs = commands.map((command) =>
            command.timer.subscribe((event) => {
                if (!event.endDate) {
                    const content = this.logger.getPrefixContent(command);
                    length = Math.max(length, content?.value.length || 0);
                    this.logger.setPrefixLength(length);
                }
            }),
        );

        return {
            commands,
            onFinish() {
                subs.forEach((sub) => sub.unsubscribe());
            },
        };
    }
}
