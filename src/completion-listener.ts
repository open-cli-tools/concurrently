import * as Rx from 'rxjs';
import { bufferCount, switchMap, take } from 'rxjs/operators';
import { CloseEvent, Command } from './command';

/**
 * Defines which command(s) in a list must exit successfully (with an exit code of `0`):
 *
 * - `first`: only the first specified command;
 * - `last`: only the last specified command;
 * - `all`: all commands.
 * - `command-{name|index}`: only the command with the specified name or index.
 * - `!command-{name|index}`: all commands but the one with the specified name or index.
 */
export type SuccessCondition = 'first' | 'last' | 'all' | `command-${string|number}` | `!command-${string|number}`;

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

    private isSuccess(events: CloseEvent[]) {
        if (this.successCondition === 'first') {
            return events[0].exitCode === 0;
        } else if (this.successCondition === 'last') {
            return events[events.length - 1].exitCode === 0;
        } else if (!/^!?command-.+$/.test(this.successCondition)) {
            // If not a `command-` syntax, then it's an 'all' condition or it's treated as such.
            return events.every(({ exitCode }) => exitCode === 0);
        }

        // Check `command-` syntax condition
        const [, nameOrIndex] = this.successCondition.split('-');
        const targetCommandEvent = events.find(({ command, index }) => (
            command.name === nameOrIndex
            || index === Number(nameOrIndex)
        ));
        return this.successCondition.startsWith('!')
            // All commands except the specified one must exit succesfully
            ? events.every((event) => event === targetCommandEvent || event.exitCode === 0)
            // Only the specified command must exit succesfully
            : targetCommandEvent && targetCommandEvent.exitCode === 0;
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
                    this.isSuccess(exitInfos)
                        ? Rx.of(exitInfos, this.scheduler)
                        : Rx.throwError(exitInfos, this.scheduler),
                ),
                take(1),
            )
            .toPromise();
    }
};
