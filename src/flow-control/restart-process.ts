import * as Rx from 'rxjs';
import { defaultIfEmpty, delayWhen, filter, map, skip, take, takeWhile } from 'rxjs/operators';

import { Command } from '../command.js';
import * as defaults from '../defaults.js';
import { Logger } from '../logger.js';
import { FlowController } from './flow-controller.js';

export type RestartDelay = number | 'exponential';

/**
 * Restarts commands that fail up to a defined number of times.
 */
export class RestartProcess implements FlowController {
    private readonly logger: Logger;
    private readonly scheduler?: Rx.SchedulerLike;
    private readonly delay: RestartDelay;
    readonly tries: number;

    constructor({
        delay,
        tries,
        logger,
        scheduler,
    }: {
        delay?: RestartDelay;
        tries?: number;
        logger: Logger;
        scheduler?: Rx.SchedulerLike;
    }) {
        this.logger = logger;
        this.delay = delay ?? 0;
        this.tries = tries != null ? +tries : defaults.restartTries;
        this.tries = this.tries < 0 ? Infinity : this.tries;
        this.scheduler = scheduler;
    }

    handle(commands: Command[]) {
        if (this.tries === 0) {
            return { commands };
        }

        const delayOperator = delayWhen((_, index) => {
            const { delay } = this;
            const value = delay === 'exponential' ? Math.pow(2, index) * 1000 : delay;
            return Rx.timer(value, this.scheduler);
        });

        commands
            .map((command) =>
                command.close.pipe(
                    take(this.tries),
                    takeWhile(({ exitCode }) => exitCode !== 0),
                ),
            )
            .forEach((failure, index) =>
                Rx.merge(
                    // Delay the emission (so that the restarts happen on time),
                    // explicitly telling the subscriber that a restart is needed
                    failure.pipe(
                        delayOperator,
                        map(() => true),
                    ),
                    // Skip the first N emissions (as these would be duplicates of the above),
                    // meaning it will be empty because of success, or failed all N times,
                    // and no more restarts should be attempted.
                    failure.pipe(
                        skip(this.tries),
                        map(() => false),
                        defaultIfEmpty(false),
                    ),
                ).subscribe((restart) => {
                    const command = commands[index];
                    if (restart) {
                        this.logger.logCommandEvent(`${command.command} restarted`, command);
                        command.start();
                    }
                }),
            );

        return {
            commands: commands.map((command) => {
                const closeStream = command.close.pipe(
                    filter(({ exitCode }, emission) => {
                        // We let all success codes pass, and failures only after restarting won't happen again
                        return exitCode === 0 || emission >= this.tries;
                    }),
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
