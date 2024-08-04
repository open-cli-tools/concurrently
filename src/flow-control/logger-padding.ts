import { Command } from '../command';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';

export class LoggerPadding implements FlowController {
    private readonly logger: Logger;

    constructor({ logger }: { logger: Logger }) {
        this.logger = logger;
    }

    handle(commands: Command[]): { commands: Command[]; onFinish: () => void } {
        // Sometimes there's limited concurrency, so not all commands will spawn straight away.
        // Compute the prefix length now, which works for all styles but those with a PID.
        let length = commands.reduce((length, command) => {
            const content = this.logger.getPrefixContent(command);
            return Math.max(length, content?.value.length || 0);
        }, 0);
        this.logger.setPrefixLength(length);

        // The length of prefixes is somewhat stable, except for PIDs, which might change when a
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
