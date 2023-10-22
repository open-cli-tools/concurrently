import * as Rx from 'rxjs';
import { Writable } from 'stream';
import { WriteStream as TtyWriteStream } from 'tty';

import { Command } from './command';

/**
 * Class responsible for actually writing output onto a writable stream.
 */
export class OutputWriter {
    private readonly outputStream: Writable;
    private get maybeTtyStream(): TtyWriteStream | undefined {
        const outputStream = this.outputStream as TtyWriteStream;
        if (outputStream instanceof TtyWriteStream) {
            return outputStream;
        }
    }

    private readonly group: boolean;
    readonly commandBuffers: string[][];
    private readonly namedBuffers: Record<string, string> = {};
    private readonly offset = { x: 0, y: 0 };

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
        this.commandBuffers = commands.map(() => []);

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

    write(command: Command | undefined, text: string, id?: string) {
        if (this.group && command) {
            if (command.index <= this.activeCommandIndex) {
                this.actualWrite(text);
            } else {
                this.commandBuffers[command.index].push(text);
            }
        } else if (id != null) {
            this.namedBuffers[id] = text;
            this.clearNamedBuffers();
            this.rewriteNamedBuffers();
        } else {
            // "global" logs (command=null) are output out of order
            this.actualWrite(text);
        }
    }

    private async actualWrite(text: string) {
        const { maybeTtyStream, outputStream } = this;
        this.clearNamedBuffers();
        if (maybeTtyStream) {
            const lines = text.split('\n');
            const lastLine = maybeClearAnsiStyles(
                lines[lines.length - 1],
                maybeTtyStream.getColorDepth(),
            );

            // In case of no line breaks, append to the existing line
            const totalLength = (lines.length === 1 ? this.offset.x : 0) + lastLine.length;

            // Account for line wrapping
            this.offset.x = totalLength % maybeTtyStream.columns;
        }

        outputStream.write(text);
        this.rewriteNamedBuffers();
    }

    private clearNamedBuffers() {
        const { maybeTtyStream } = this;
        if (!maybeTtyStream) {
            return;
        }

        // Rewind to the end of unnamed buffers
        maybeTtyStream.moveCursor(0, -this.offset.y);
        maybeTtyStream.cursorTo(this.offset.x);
        maybeTtyStream.clearScreenDown();
    }

    private rewriteNamedBuffers() {
        const outputStream = this.maybeTtyStream;
        if (!outputStream) {
            return;
        }

        this.offset.y = 0;
        for (const text of Object.values(this.namedBuffers)) {
            outputStream.write('\n' + text);
            this.offset.y += text.split('\n').reduce((count, chunk) => {
                return count + 1 + Math.floor(chunk.length / outputStream.columns);
            }, 0);
        }
    }

    private flushBuffer(index: number) {
        this.commandBuffers[index].forEach((t) => this.actualWrite(t));
        this.commandBuffers[index] = [];
    }
}

// Exported for testing
export function maybeClearAnsiStyles(text: string, colorSupport: number) {
    // Matches https://github.com/chalk/ansi-styles/blob/v4.3.0/index.js#L3-L16
    // eslint-disable-next-line no-control-regex
    return colorSupport > 2 ? text.replace(/\u001B\[\d+(;5;\d+|;2;\d+;\d+;\d+)?m/g, '') : text;
}
