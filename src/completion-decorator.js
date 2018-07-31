const Rx = require('rxjs');
const { map, skipUntil } = require('rxjs/operators');

module.exports = class CompletionDecorator {
    constructor({ controllers, successCondition }) {
        this.successCondition = successCondition;
        this.controllers = controllers;
    }

    handle(commands) {
        const results = this.controllers.map(controller => controller.handle(commands));
        const controllersDone = Rx.forkJoin(...results);
        const closeStreams = commands.map(command => command.close);
        const subject = new Rx.Subject();

        Rx.combineLatest(...closeStreams)
            .pipe(skipUntil(controllersDone))
            .pipe(map(exitCodes => {
                switch (this.successCondition) {
                    case 'first':
                        return exitCodes[0] === 0;

                    case 'last':
                        return exitCodes[exitCodes.length - 1] === 0;

                    default:
                        return exitCodes.every(exitCode => exitCode === 0);
                }
            }))
            .subscribe(success => {
                success ? subject.complete() : subject.error();
            });

        return subject.asObservable();
    }
}
