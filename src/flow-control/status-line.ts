import * as crypto from 'crypto';
import * as Rx from 'rxjs';

import { Command, CommandIdentifier } from '../command';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';

export class StatusLine implements FlowController {
    private readonly logger: Logger;

    constructor({ logger }: { logger: Logger }) {
        this.logger = logger;
    }

    private writeStatusLine(id: string, commands: Map<CommandIdentifier, string>) {
        let line = '';
        for (const [commandId, status] of commands.entries()) {
            const description = typeof commandId === 'number' ? `Command ${commandId}` : commandId;
            line += ` [${status} ${description}]`;
        }

        this.logger.logAt(id, line.trim());
    }

    handle(commands: Command[]): { commands: Command[]; onFinish?: (() => void) | undefined } {
        // reserveLine() -> uuid
        // logAt(uuid, text) -> emits logger output with uuid
        // writer offsets every non-ID by all of the ID'd lines

        const id = crypto.randomUUID();
        const map = new Map<CommandIdentifier, string>(
            commands.map((command, index) => [command.name || index, '⏳']),
        );

        setTimeout(() => this.writeStatusLine(id, map));
        const closeStreams = commands.map((command) => command.close);
        Rx.merge(...closeStreams).subscribe((event) => {
            map.set(event.command.name || event.index, event.exitCode === 0 ? '✅' : '❌');
            this.writeStatusLine(id, map);
        });

        return { commands };
    }
}
