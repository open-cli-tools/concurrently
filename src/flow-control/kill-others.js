const _ = require('lodash');

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
            return;
        }

        const subscriptions = commands.map(command => {
            let restartsLeft = this.restartTries;
            return command.close
                .map(exitCode => exitCode === 0 ? 'success' : 'failure')
                // Everytime a failure happens, it's known that a restart could follow.
                // And, while restarts are allowed, failures are dismissable.
                .do(state => restartsLeft -= state === 'failure' ? 1 : 0)
                .skipWhile(state => state === 'failure' && restartsLeft >= 0)
                .filter(state => conditions.includes(state))
                .subscribe(() => {
                    this.logger.logGlobalEvent('Sending SIGTERM to other processes..');

                    subscriptions.forEach(subscription => subscription.unsubscribe());
                    commands.forEach(command => command.kill());
                });
        });
    }
}
