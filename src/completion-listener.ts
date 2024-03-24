import * as Rx from 'rxjs';
import { delay, filter, map, switchMap, take } from 'rxjs/operators';

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

    private isSuccess(events: (CloseEvent | undefined)[]) {
        if (this.successCondition === 'first') {
            return isSuccess(events[0]);
        } else if (this.successCondition === 'last') {
            return isSuccess(events[events.length - 1]);
        }

        const commandSyntaxMatch = this.successCondition.match(/^!?command-(.+)$/);
        if (commandSyntaxMatch == null) {
            // If not a `command-` syntax, then it's an 'all' condition or it's treated as such.
            return events.every(isSuccess);
        }

        // Check `command-` syntax condition.
        // Note that a command's `name` is not necessarily unique,
        // in which case all of them must meet the success condition.
        const nameOrIndex = commandSyntaxMatch[1];
        const targetCommandsEvents = events.filter(
            (event) => event?.command.name === nameOrIndex || event?.index === Number(nameOrIndex),
        );
        if (this.successCondition.startsWith('!')) {
            // All commands except the specified ones must exit successfully
            return events.every(
                (event) => targetCommandsEvents.includes(event) || isSuccess(event),
            );
        }
        // Only the specified commands must exit succesfully
        return targetCommandsEvents.length > 0 && targetCommandsEvents.every(isSuccess);
    }

    /**
     * Given a list of commands, wait for all of them to exit and then evaluate their exit codes.
     *
     * @returns A Promise that resolves if the success condition is met, or rejects otherwise.
     *          In either case, the value is a list of close events for commands that spawned.
     *          Commands that didn't spawn are filtered out.
     */
    listen(commands: Command[], abortSignal?: AbortSignal): Promise<CloseEvent[]> {
        const abort =
            abortSignal &&
            Rx.fromEvent(abortSignal, 'abort', { once: true }).pipe(
                // The abort signal must happen before commands are killed, otherwise new commands
                // might spawn. Because of this, it's not be possible to capture the close events
                // without an immediate delay
                delay(0, this.scheduler),
                map(() => undefined),
            );

        const closeStreams = commands.map((command) =>
            abort
                ? // Commands that have been started must close.
                  Rx.race(command.close, abort.pipe(filter(() => command.state === 'stopped')))
                : command.close,
        );
        return Rx.lastValueFrom(
            Rx.combineLatest(closeStreams).pipe(
                filter((events) =>
                    commands.every(
                        (command, i) => command.state !== 'started' || events[i] === undefined,
                    ),
                ),
                map((exitInfos) =>
                    exitInfos.sort((first, second) => {
                        if (!first || !second) {
                            return 0;
                        }
                        return first.timings.endDate.getTime() - second.timings.endDate.getTime();
                    }),
                ),
                switchMap((events) => {
                    const success = this.isSuccess(events);
                    const filteredEvents = events.filter(
                        (event): event is CloseEvent => event != null,
                    );
                    return success
                        ? this.emitWithScheduler(Rx.of(filteredEvents))
                        : this.emitWithScheduler(Rx.throwError(() => filteredEvents));
                }),
                take(1),
            ),
        );
    }

    private emitWithScheduler<O>(input: Rx.Observable<O>): Rx.Observable<O> {
        return this.scheduler ? input.pipe(Rx.observeOn(this.scheduler)) : input;
    }
}

function isSuccess(event: CloseEvent | undefined) {
    return event == null || event.exitCode === 0;
}
