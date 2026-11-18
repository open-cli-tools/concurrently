import { StringDecoder } from 'node:string_decoder';

import { Command } from '../command.js';
import { Logger } from '../logger.js';
import { FlowController } from './flow-controller.js';

/**
 * Logs the stdout and stderr output of commands.
 */
export class LogOutput implements FlowController {
    private readonly logger: Logger;
    constructor({ logger }: { logger: Logger }) {
        this.logger = logger;
    }

    handle(commands: Command[]) {
        commands.forEach((command) => {
            // Each stream gets its own decoder, so that a multi-byte character whose bytes
            // are split across two chunks is decoded once all of its bytes have arrived.
            const decoders = [command.stdout, command.stderr].map((stream) => {
                const decoder = new StringDecoder('utf8');
                stream.subscribe((chunk) => this.log(decoder.write(chunk), command));
                return decoder;
            });

            // Whatever is still buffered when the command closes can't be completed anymore.
            // Flushing also makes sure it doesn't leak into the output of a restarted command.
            command.close.subscribe(() => {
                decoders.forEach((decoder) => this.log(decoder.end(), command));
            });
        });

        return { commands };
    }

    private log(text: string, command: Command) {
        if (text) {
            this.logger.logCommandText(text, command);
        }
    }
}
