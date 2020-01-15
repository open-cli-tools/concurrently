const Rx = require('rxjs');
const { bufferCount, map, switchMap, take } = require('rxjs/operators');

module.exports = class CompletionListener {
    constructor({ successCondition, scheduler }) {
        this.successCondition = successCondition;
        this.scheduler = scheduler;
    }

    isSuccess(exitCodes) {
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
    }

    listen(commands) {
        const closeStreams = commands.map(command => command.close);
        return Rx.merge(...closeStreams)
            .pipe(
                bufferCount(closeStreams.length),
                switchMap(exitCodes =>
                    this.isSuccess(exitCodes)
                        ? Rx.of(exitCodes, this.scheduler)
                        : Rx.throwError(exitCodes, this.scheduler)
                ),
                take(1)
            )
            .toPromise();
    }
};
