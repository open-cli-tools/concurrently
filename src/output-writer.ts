import { Writable } from 'stream';
import { Command } from './command';
import * as Rx from 'rxjs';

export class OutputWriter {
    private readonly outputStream: Writable;
    private readonly group: boolean;
    readonly buffers: string[][];
    activeCommandIndex = 0;

    constructor({ outputStream, group, commands }: {
        outputStream: Writable,
        group: boolean,
        commands: Command[],
    }) {
        this.outputStream = outputStream;
        this.group = group;
        this.buffers = commands.map(() => []);

        if (this.group) {
            Rx.merge(...commands.map(c => c.close))
                .subscribe(command => {
                    if (command.index !== this.activeCommandIndex) {
                        return;
                    }
                    for (let i = command.index + 1; i < commands.length; i++) {
                        this.activeCommandIndex = i;
                        this.flushBuffer(i);
                        if (!commands[i].exited) {
                            break;
                        }
                    }
                });
        }
    }

    write(command, text) {
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

    flushBuffer(index) {
        this.buffers[index].forEach(t => this.outputStream.write(t));
        this.buffers[index] = [];
    }
};
