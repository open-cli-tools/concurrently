const { combineLatest } = require('rxjs');
const { map, skipWhile } = require('rxjs/operators');

module.exports = class CompletionHandler {
    constructor({ successCondition }) {
        this.successCondition = successCondition;
    }

    handle(commands, controlSubject) {
        const streams = commands.map(command => command.close);
        combineLatest(...streams)
            .pipe(skipWhile(() => commands.some(command => command.process)))
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
                success ? controlSubject.completed() : controlSubject.error();
            });
    }
}
