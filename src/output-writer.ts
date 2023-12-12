import * as Rx from 'rxjs';
import { Writable } from 'stream';

import { Command } from './command';

/**
 * Class responsible for actually writing output onto a writable stream.
 */
export class OutputWriter {
    private readonly outputStream: Writable;
    private readonly group: boolean;
    readonly buffers: string[][];
    activeCommandIndex = 0;

    constructor({
        outputStream,
        group,
        commands,
    }: {
        outputStream: Writable;
        group: boolean;
        commands: Command[];
    }) {
        this.outputStream = outputStream;
        this.group = group;
        this.buffers = commands.map(() => []);

        if (this.group) {
            Rx.merge(...commands.map((c) => c.close)).subscribe((command) => {
                if (command.index !== this.activeCommandIndex) {
                    return;
                }
                for (let i = command.index + 1; i < commands.length; i++) {
                    this.activeCommandIndex = i;
                    this.flushBuffer(i);
                    // TODO: Should errored commands also flush buffer?
                    if (commands[i].state !== 'exited') {
                        break;
                    }
                }
            });
        }
    }

    write(command: Command | undefined, text: string) {
        if (this.group && command) {
            if (command.index <= this.activeCommandIndex) {
                this.outputStream.write(text);
            } else {
                this.buffers[command.index].push(text);
            }
        } else {
            // "global" logs (command=null) are output out of order
            this.outputStream.write(text);
        }
    }

    private flushBuffer(index: number) {
        this.buffers[index].forEach((t) => this.outputStream.write(t));
        this.buffers[index] = [];
    }
}
