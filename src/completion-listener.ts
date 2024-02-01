import * as Rx from 'rxjs';
import { bufferCount, switchMap, take } from 'rxjs/operators';

import { CloseEvent, Command } from './command';

/**
 * Defines which command(s) in a list must exit successfully (with an exit code of `0`):
 *
 * - `first`: only the first specified command;
 * - `last`: only the last specified command;
 * - `all`: all commands.
 * - `command-{name|index}`: only the commands with the specified names or index.
 * - `!command-{name|index}`: all commands but the ones with the specified names or index.
 */
export type SuccessCondition =
    | 'first'
    | 'last'
    | 'all'
    | `command-${string | number}`
    | `!command-${string | number}`;

/**
 * Provides logic to determine whether lists of commands ran successfully.
 */
export class CompletionListener {
    private readonly successCondition: SuccessCondition;
    private readonly scheduler?: Rx.SchedulerLike;

    constructor({
        successCondition = 'all',
        scheduler,
    }: {
        /**
         * How this instance will define that a list of commands ran successfully.
         * Defaults to `all`.
         *
         * @see {SuccessCondition}
         */
        successCondition?: SuccessCondition;

        /**
         * For testing only.
         */
        scheduler?: Rx.SchedulerLike;
    }) {
        this.successCondition = successCondition;
        this.scheduler = scheduler;
    }

    private isSuccess(events: CloseEvent[]) {
        if (this.successCondition === 'first') {
            return events[0].exitCode === 0;
        } else if (this.successCondition === 'last') {
            return events[events.length - 1].exitCode === 0;
        }

        const commandSyntaxMatch = this.successCondition.match(/^!?command-(.+)$/);
        if (commandSyntaxMatch == null) {
            // If not a `command-` syntax, then it's an 'all' condition or it's treated as such.
            return events.every(({ exitCode }) => exitCode === 0);
        }

        // Check `command-` syntax condition.
        // Note that a command's `name` is not necessarily unique,
        // in which case all of them must meet the success condition.
        const nameOrIndex = commandSyntaxMatch[1];
        const targetCommandsEvents = events.filter(
            ({ command, index }) => command.name === nameOrIndex || index === Number(nameOrIndex),
        );
        if (this.successCondition.startsWith('!')) {
            // All commands except the specified ones must exit successfully
            return events.every(
                (event) => targetCommandsEvents.includes(event) || event.exitCode === 0,
            );
        }
        // Only the specified commands must exit successfully
        return (
            targetCommandsEvents.length > 0 &&
            targetCommandsEvents.every((event) => event.exitCode === 0)
        );
    }

    /**
     * Given a list of commands, wait for all of them to exit and then evaluate their exit codes.
     *
     * @returns A Promise that resolves if the success condition is met, or rejects otherwise.
     */
    listen(commands: Command[]): Promise<CloseEvent[]> {
        const closeStreams = commands.map((command) => command.close.pipe(take(1)));

        return Rx.lastValueFrom(
            Rx.merge(...closeStreams).pipe(
                bufferCount(closeStreams.length),
                switchMap((exitInfos) =>
                    this.isSuccess(exitInfos)
                        ? this.emitWithScheduler(Rx.of(exitInfos))
                        : this.emitWithScheduler(Rx.throwError(() => exitInfos)),
                ),
                take(1),
            ),
        );
    }

    private emitWithScheduler<O>(input: Rx.Observable<O>): Rx.Observable<O> {
        return this.scheduler ? input.pipe(Rx.observeOn(this.scheduler)) : input;
    }
}
