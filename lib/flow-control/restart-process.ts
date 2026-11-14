import Rx from 'rxjs';
import { delayWhen, filter } from 'rxjs/operators';

import { CloseEvent, Command } from '../command.js';
import * as defaults from '../defaults.js';
import { Logger } from '../logger.js';
import { FlowController } from './flow-controller.js';

export type RestartDelay = number | 'exponential';

interface RestartRequest {
    index: number;
    attempt: number;
}

/**
 * Restarts commands that fail up to a defined number of times.
 *
 * `tries` caps the restarts of each command on its own, while `totalTries` caps all of
 * them together. The shared budget matters when a command is torn down by another one:
 * without it, a command killed right after the retries ran out would be restarted again.
 */
export class RestartProcess implements FlowController {
    private readonly logger: Logger;
    private readonly scheduler?: Rx.SchedulerLike;
    private readonly delay: RestartDelay;
    readonly tries: number;
    readonly totalTries: number;

    constructor({
        delay,
        tries,
        totalTries,
        logger,
        scheduler,
    }: {
        delay?: RestartDelay;
        tries?: number;
        totalTries?: number;
        logger: Logger;
        scheduler?: Rx.SchedulerLike;
    }) {
        this.logger = logger;
        this.delay = delay ?? 0;
        this.tries = tries != null ? +tries : defaults.restartTries;
        this.tries = this.tries < 0 ? Infinity : this.tries;
        this.totalTries = totalTries != null ? +totalTries : defaults.totalRestartTries;
        this.totalTries = this.totalTries < 0 ? Infinity : this.totalTries;
        this.scheduler = scheduler;
    }

    handle(commands: Command[]) {
        if (this.tries === 0 || this.totalTries === 0) {
            return { commands };
        }

        let restartsLeft = this.totalTries;
        // Whether the Nth close of each command is passed on to the other controllers,
        // indexed by the order in which that command closed. A restarted close isn't.
        const forwarded = commands.map(() => [] as boolean[]);
        const restartRequests = new Rx.Subject<RestartRequest>();

        // This subscription is attached before the controllers below subscribe to the
        // filtered streams, so the outcome of a close is known by the time they see it.
        commands.forEach((command, index) => {
            let closes = 0;
            command.close.subscribe((event: CloseEvent) => {
                const restart = event.exitCode !== 0 && closes < this.tries && restartsLeft > 0;
                const attempt = closes++;
                if (restart) {
                    restartsLeft -= 1;
                    restartRequests.next({ index, attempt });
                }

                forwarded[index][attempt] = !restart;
            });
        });

        restartRequests
            .pipe(
                delayWhen(({ attempt }) => {
                    const { delay } = this;
                    const value = delay === 'exponential' ? 2 ** attempt * 1000 : delay;
                    return Rx.timer(value, this.scheduler);
                }),
            )
            .subscribe(({ index }) => {
                const command = commands[index];
                this.logger.logCommandEvent(`${command.command} restarted`, command);
                command.start();
            });

        return {
            commands: commands.map((command, index) => {
                const closeStream = command.close.pipe(
                    filter((_, emission) => forwarded[index][emission] ?? true),
                );

                // Return a proxy so that mutations happen on the original Command object.
                // If either `Object.assign()` or `Object.create()` were used, it'd be hard to
                // reflect the mutations on Command objects referenced by previous flow controllers.
                return new Proxy(command, {
                    get(target, prop: keyof Command) {
                        return prop === 'close' ? closeStream : target[prop];
                    },
                });
            }),
        };
    }
}
