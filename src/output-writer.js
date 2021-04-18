// @ts-check
const Rx = require('rxjs');
/** @typedef {import('./command')} Command */

module.exports = class OutputWriter {
    /**
     * @param {object} options
     * @param {NodeJS.WriteStream} options.outputStream
     * @param {boolean} options.group
     * @param {Command[]} options.commands
     */
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

    /**
     * @param {Command} command
     * @param {string} text
     */
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

    /**
     * @param {number} index
     */
    flushBuffer(index) {
        this.buffers[index].forEach(t => this.outputStream.write(t));
        this.buffers[index] = [];
    }
};
