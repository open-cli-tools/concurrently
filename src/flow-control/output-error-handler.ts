import { Writable } from 'stream';

import { Command } from '../command.js';
import { fromSharedEvent } from '../observables.js';
import { FlowController } from './flow-controller.js';

/**
 * Kills processes and aborts further command spawning on output stream error (namely, SIGPIPE).
 */
export class OutputErrorHandler implements FlowController {
    private readonly outputStream: Writable;
    private readonly abortController: AbortController;

    constructor({
        abortController,
        outputStream,
    }: {
        abortController: AbortController;
        outputStream: Writable;
    }) {
        this.abortController = abortController;
        this.outputStream = outputStream;
    }

    handle(commands: Command[]): { commands: Command[]; onFinish(): void } {
        const subscription = fromSharedEvent(this.outputStream, 'error').subscribe(() => {
            commands.forEach((command) => command.kill());

            // Avoid further commands from spawning, e.g. if `RestartProcess` is used.
            this.abortController.abort();
        });

        return {
            commands,
            onFinish: () => subscription.unsubscribe(),
        };
    }
}
