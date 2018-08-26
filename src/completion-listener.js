const Rx = require('rxjs');
const { bufferCount, map, switchMap, take } = require('rxjs/operators');

module.exports = class CompletionListener {
    constructor({ successCondition, scheduler }) {
        this.successCondition = successCondition;
        this.scheduler = scheduler;
    }

    listen(commands) {
        const closeStreams = commands.map(command => command.close);
        const allClosed = Rx.zip(...closeStreams);
        return Rx.merge(...closeStreams).pipe(
            bufferCount(closeStreams.length),
            map(exitCodes => {
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
            switchMap(success => success
                ? Rx.of(null, this.scheduler)
                : Rx.throwError(new Error(), this.scheduler)),
            take(1)
        ).toPromise();
    }
};
