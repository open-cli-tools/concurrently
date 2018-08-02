const _ = require('lodash');
const Rx = require('rxjs');
const { filter, first, map, tap, skipWhile } = require('rxjs/operators');

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
            return Rx.of(null);
        }

        const closeStates = commands.map(command => {
            let restartsLeft = this.restartTries;
            return command.close.pipe(
                map(exitCode => exitCode === 0 ? 'success' : 'failure'),
                // Everytime a failure happens, it's known that a restart could follow.
                tap(state => restartsLeft -= state === 'failure' ? 1 : 0),
                // While restarts are allowed, failures are dismissable.
                skipWhile(state => state === 'failure' && restartsLeft >= 0),
                first()
            );
        });

        closeStates.forEach(closeState => {
            closeState.subscribe(state => {
                const killableCommands = commands.filter(command => command.killable);
                if (conditions.includes(state) && killableCommands.length) {
                    this.logger.logGlobalEvent('Sending SIGTERM to other processes..');
                    commands.forEach(command => command.kill());
                }
            });
        });

        return Rx.forkJoin(closeStates);
    }
};
