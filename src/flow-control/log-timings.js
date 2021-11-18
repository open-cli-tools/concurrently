const Rx = require('rxjs');
const _ = require('lodash');
const formatDate = require('date-fns/format');
const { bufferCount, take } = require('rxjs/operators');
const BaseHandler = require('./base-handler');

module.exports = class LogTimings extends BaseHandler {
    constructor({ logger, timestampFormat }) {
        super({ logger });

        this.timestampFormat = timestampFormat;
    }

    printExitInfoTimingTable(exitInfos) {
        const exitInfoTable = _(exitInfos)
            .sortBy(({timings}) => timings.durationSeconds)
            .reverse()
            .map(({ command, timings, killed, exitCode }) => {
                const readableDurationMs = (timings.endDate - timings.startDate).toLocaleString();
                return {
                    name: command.name,
                    duration: `${readableDurationMs}ms`,
                    'exit code': exitCode,
                    killed,
                    command: command.command,
                };
            })
            .value();

        console.log('\nTimings:');
        console.table(exitInfoTable);
        return exitInfos;
    };

    handle(commands) {
        if (!this.logger) { return {commands}; }

        const controllerInstance = this;

        // individual process timings
        commands.forEach(command => {
            command.timer.subscribe( {
                next: ({startDate, endDate}) => {
                    if (!endDate) {
                        controllerInstance.logger.logCommandEvent( `${ command.command } started at ${ formatDate(startDate, controllerInstance.timestampFormat) }`, command );
                    } else {
                        const durationMs = (endDate.getTime() - startDate.getTime());

                        controllerInstance.logger.logCommandEvent( `${ command.command } stopped at ${ formatDate(endDate, controllerInstance.timestampFormat) } after ${durationMs.toLocaleString()}ms`, command );
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
