const Rx = require('rxjs');
const blessed = require('neo-blessed');

const DEFAULT_SCROLL_OPTIONS = {
    scrollable: true,
    input: true,
    alwaysScroll: true,
    scrollbar: {
        ch: ' ',
        inverse: true
    },
    keys: true,
    vi: true,
    mouse: true
};

module.exports = class LogOutput {
    constructor({ logger, grid }) {
        this.logger = logger;
        this.grid = grid;
    }

    handle(commands) {
        if (this.grid) {
            const screen = blessed.screen({
                smartCSR: true,
                dockBorders: false,
                fullUnicode: true,
            });

            // Makes sure when the screen is killed, all the child commands are properly killed
            screen.key(['escape', 'q', 'C-c'], function(ch, key) {
                const killObservables = commands.map(command => {
                    return Rx.Observable.create(observer => {
                        command.kill('SIGINT', error => {
                            console.error(error);
                            observer.complete();
                        });
                    });
                });

                Rx.forkJoin(killObservables).subscribe({
                    complete() {
                        process.kill(process.pid, 'SIGINT');
                    }
                });
            });

            const numberOfRows = Math.ceil(commands.length / 2);

            commands.forEach((command, index) => {
                // Calculate grid positions for current command
                const leftPosition = index % 2 === 0 ? '0%' : '50%';
                const rowHeight = (100 / numberOfRows);
                const commandRowNr = Math.floor(index / 2);
                const topPosition = commandRowNr * rowHeight;

                let boxWidth = '50%';
                // it should be fullwidth if it's the last element of an odd number of commands.
                // we only support a grid of 2 columns for now
                const isFullWidth = commands.length === index + 1 && commands.length % 2 !== 0;
                if (isFullWidth) {
                    boxWidth = '100%';
                }

                const commandPrefix = this.logger.getPrefix(command);
                const blessedBox = blessed.box({
                    label: commandPrefix,
                    width: boxWidth,
                    height: `${rowHeight}%`,
                    left: leftPosition,
                    top: `${topPosition}%`,
                    border: {
                        type: 'line',
                    },
                    style: {
                        border: {
                            fg: command.prefixColor.toString()
                        }
                    }
                });
                const blessedBoxLogger = blessed.log(
                    Object.assign({}, DEFAULT_SCROLL_OPTIONS, {
                        parent: blessedBox,
                        tags: true,
                    })
                );
                screen.append(blessedBox);

                command.stdout.subscribe(text => {
                    blessedBoxLogger.log(text.toString());
                    blessedBoxLogger.screen.render();
                });
                command.stderr.subscribe(text => {
                    blessedBoxLogger.log(text.toString());
                    blessedBoxLogger.screen.render();
                });
            });
        } else {
            commands.forEach(command => {
                command.stdout.subscribe(text => this.logger.logCommandText(text.toString(), command));
                command.stderr.subscribe(text => this.logger.logCommandText(text.toString(), command));
            });
        }

        return commands;
    }
};
