import * as Rx from 'rxjs';
import { bufferCount, switchMap, take } from 'rxjs/operators';
import { CloseEvent, Command } from './command';

/**
 * Defines which command(s) in a list must exit successfully (with an exit code of `0`):
 *
 * - `first`: only the first specified command;
 * - `last`: only the last specified command;
 * - `all`: all commands.
 */
export type SuccessCondition = 'first' | 'last' | 'all';

/**
 * Provides logic to determine whether lists of commands ran successfully.
*/
export class CompletionListener {
    private readonly successCondition: SuccessCondition;
    private readonly scheduler?: Rx.SchedulerLike;

    constructor({ successCondition = 'all', scheduler }: {
        /**
         * How this instance will define that a list of commands ran successfully.
         * Defaults to `all`.
         *
         * @see {SuccessCondition}
         */
        successCondition?: SuccessCondition,

        /**
         * For testing only.
         */
        scheduler?: Rx.SchedulerLike,
    }) {
        this.successCondition = successCondition;
        this.scheduler = scheduler;
    }

    private isSuccess(exitCodes: (string | number)[]) {
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

    /**
     * Given a list of commands, wait for all of them to exit and then evaluate their exit codes.
     *
     * @returns A Promise that resolves if the success condition is met, or rejects otherwise.
     */
    listen(commands: Command[]): Promise<CloseEvent[]> {
        const closeStreams = commands.map(command => command.close);
        return Rx.merge(...closeStreams)
            .pipe(
                bufferCount(closeStreams.length),
                switchMap(exitInfos =>
                    this.isSuccess(exitInfos.map(({ exitCode }) => exitCode))
                        ? Rx.of(exitInfos, this.scheduler)
                        : Rx.throwError(exitInfos, this.scheduler),
                ),
                take(1),
            )
            .toPromise();
    }
};
