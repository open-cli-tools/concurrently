const _ = require('lodash');
const Rx = require('rxjs');
const { map, tap, skipWhile, filter } = require('rxjs/operators');

module.exports = class KillOthers {
    constructor({ logger, conditions, restartTries }) {
        this.logger = logger;
        this.conditions = _.castArray(conditions);
        this.restartTries = +restartTries || 0;
    }

    handle(commands) {
        const conditions = this.conditions.filter(condition => (
            condition === 'failure' ||
            condition === 'success'
        ));

        if (!conditions.length) {
            return Rx.empty();
        }

        const subject = new Rx.Subject();
        const subscriptions = commands.map(command => {
            let restartsLeft = this.restartTries;
            return command.close
                .pipe(map(exitCode => exitCode === 0 ? 'success' : 'failure'))
                // Everytime a failure happens, it's known that a restart could follow.
                // And, while restarts are allowed, failures are dismissable.
                .pipe(tap(state => restartsLeft -= state === 'failure' ? 1 : 0))
                .pipe(skipWhile(state => state === 'failure' && restartsLeft >= 0))
                .pipe(filter(state => conditions.includes(state)))
                .subscribe(() => {
                    this.logger.logGlobalEvent('Sending SIGTERM to other processes..');

                    subscriptions.forEach(subscription => subscription.unsubscribe());
                    commands.forEach(command => command.kill());
                    subject.complete();
                });
        });

        return subject.asObservable();
    }
}
