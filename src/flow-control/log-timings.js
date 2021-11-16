const Rx = require('rxjs');
const _ = require('lodash');
const { bufferCount, take } = require('rxjs/operators');
const BaseHandler = require('./base-handler');

module.exports = class LogTimings extends BaseHandler {
    printExitInfoTimingTable(exitInfos) {
        const exitInfoTable = _(exitInfos)
            .map(({ command, timings, index, killed, exitCode }) => {
                const readableDurationMs = (timings.endDate - timings.startDate).toLocaleString();
                return {
                    'call-index': index,
                    name: command.name,
                    duration: `~${readableDurationMs}ms`,
                    'exit-code': exitCode,
                    killed,
                    command: command.command,
                };
            })
            .sortBy('duration')
            .value();

        console.log('\nTimings:');
        console.table(exitInfoTable);
        return exitInfos;
    };

    handle(commands) {
        if (!this.logger) { return {commands}; }

        // individual process timings
        commands.forEach(command => {
            command.timer.subscribe( {
                next: ({startDate, endDate}) => {
                    if (!endDate) {
                        this.logger.logCommandEvent( `${ command.command } started at ${ startDate.toLocaleString() }`, command );
                    } else {
                        const durationMs = (endDate.getTime() - startDate.getTime());

                        this.logger.logCommandEvent( `${ command.command } stopped at ${ endDate.toLocaleString() } after ${durationMs.toLocaleString()}ms`, command );
                    }
                },
            } );
        });

        // overall summary timings
        const closeStreams = commands.map(command => command.close);
        this.allProcessesClosed = Rx.merge(...closeStreams)
            .pipe(
                bufferCount(closeStreams.length),
                take(1),
            );
        this.allProcessesClosed.subscribe((exitInfos) => this.printExitInfoTimingTable(exitInfos));

        return {commands};
    }
};
