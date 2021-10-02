const Rx = require('rxjs');

module.exports = class OutputWriter {
    constructor({ outputStream, group, commands }) {
        this.outputStream = outputStream;
        this.group = group;
        this.commands = commands;
        this.buffers = this.commands.map(() => []);
        this.activeCommandIndex = 0;

        if (this.group) {
            Rx.merge(...this.commands.map(c => c.close))
                .subscribe(command => {
                    if (command.index !== this.activeCommandIndex) {
                        return;
                    }
                    for (let i = command.index + 1; i < this.commands.length; i++) {
                        this.activeCommandIndex = i;
                        this.flushBuffer(i);
                        if (!this.commands[i].exited) {
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
