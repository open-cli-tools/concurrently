const Rx = require('rxjs');
const { map, switchMap, withLatestFrom } = require('rxjs/operators');

module.exports = class CompletionDecorator {
    constructor({ controllers, successCondition }) {
        this.successCondition = successCondition;
        this.controllers = controllers;
    }

    handle(commands) {
        const results = this.controllers.map(controller => controller.handle(commands));
        const closeStreams = commands.map(command => command.close);

        return Rx.forkJoin(results).pipe(
            // Lots of close events can happen before the controllers are done,
            // so when they finally complete, we only care about the last exit code
            withLatestFrom(Rx.combineLatest(closeStreams)),
            map(([, exitCodes]) => {
                switch (this.successCondition) {
                /* eslint-disable indent */
                    case 'first':
                        return exitCodes[0] === 0;

                    case 'last':
                        return exitCodes[exitCodes.length - 1] === 0;

                    default:
                        return exitCodes.every(exitCode => exitCode === 0);
                /* eslint-enable indent */
                }
            }),
            switchMap(success => success ? Rx.of(null) : Rx.throwError())
        );
    }
};
