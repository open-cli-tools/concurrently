import * as Rx from 'rxjs';
import { bufferCount, switchMap, take } from 'rxjs/operators';

export type SuccessCondition = 'first' | 'last' | 'all';

interface CompletionListenerParams {
    successCondition?: SuccessCondition;
    scheduler?: Rx.SchedulerLike;
}

export class CompletionListener {
    private readonly successCondition: SuccessCondition;
    private readonly scheduler: Rx.SchedulerLike;

    constructor({ successCondition, scheduler }: CompletionListenerParams) {
        this.successCondition = successCondition || 'all';
        this.scheduler = scheduler;
    }

    private isSuccess(exitCodes) {
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
                switchMap(exitInfos =>
                    this.isSuccess(exitInfos.map(({ exitCode }) => exitCode))
                        ? Rx.of(exitInfos, this.scheduler)
                        : Rx.throwError(exitInfos, this.scheduler)
                ),
                take(1)
            )
            .toPromise();
    }
};
