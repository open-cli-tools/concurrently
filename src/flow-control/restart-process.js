const Rx = require('rxjs');
const { defaultIfEmpty, delay, filter, mapTo, skip, take, takeWhile } = require('rxjs/operators');

const defaults = require('../defaults');

module.exports = class RestartProcess {
    constructor({ delay, tries, logger, scheduler }) {
        this.delay = +delay || defaults.restartDelay;
        this.tries = +tries || defaults.restartTries;
        this.logger = logger;
        this.scheduler = scheduler;
    }

    handle(commands) {
        if (this.tries === 0) {
            return commands;
        }

        commands.map(command => command.close.pipe(
            take(this.tries),
            takeWhile(code => code !== 0)
        )).map((failure, index) => Rx.merge(
            // Delay the emission (so that the restarts happen on time),
            // explicitly telling the subscriber that a restart is needed
            failure.pipe(delay(this.delay, this.scheduler), mapTo(true)),
            // Skip the first N emissions (as these would be duplicates of the above),
            // meaning it will be empty because of success, or failed all N times,
            // and no more restarts should be attempted.
            failure.pipe(skip(this.tries), defaultIfEmpty(false))
        ).subscribe(restart => {
            const command = commands[index];
            if (restart) {
                this.logger.logCommandEvent(`${command.command} restarted`, command);
                command.start();
            }
        }));

        return commands.map(command => {
            const closeStream = command.close.pipe(filter((value, emission) => {
                // We let all success codes pass, and failures only after restarting won't happen again
                return value === 0 || emission >= this.tries;
            }));

            return new Proxy(command, {
                get(target, prop) {
                    return prop === 'close' ? closeStream : target[prop];
                }
            });
        });
    }
};
