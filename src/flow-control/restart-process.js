const Rx = require('rxjs');
const { defaultIfEmpty, delay, mapTo, skip, take, takeWhile } = require('rxjs/operators');

module.exports = class RestartProcess {
    constructor({ delay, tries, logger }) {
        this.delay = +delay || 0;
        this.tries = +tries || 0;
        this.logger = logger;
    }

    handle(commands) {
        if (this.tries === 0) {
            return Rx.of(null);
        }

        const shouldRestart = commands.map(command => command.close.pipe(
            take(this.tries),
            takeWhile(code => code !== 0)
        )).map(failure => Rx.merge(
            // Delay the emission (so that the restarts happen on time),
            // explicitly telling the subscriber that a restart is needed
            failure.pipe(delay(this.delay), mapTo(true)),
            // Skip the first N emissions (as these would be duplicates of the above),
            // meaning it will be empty because of success, or failed all N times,
            // and no more restarts should be attempted.
            failure.pipe(skip(this.tries), defaultIfEmpty(false))
        ));

        commands.forEach((command, index) => shouldRestart[index].subscribe(restart => {
            if (restart) {
                this.logger.logCommandEvent(`${command.command} restarted`, command);
                command.start();
            }
        }));

        return Rx.forkJoin(shouldRestart);
    }
};
