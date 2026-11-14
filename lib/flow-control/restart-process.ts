import EventEmitter from 'node:events';

import Rx from 'rxjs';
import {
    defaultIfEmpty,
    delayWhen,
    filter,
    map,
    mergeWith,
    skip,
    take,
    takeWhile,
} from 'rxjs/operators';

import { CloseEvent, Command } from '../command.js';
import * as defaults from '../defaults.js';
import { Logger } from '../logger.js';
import { FlowController } from './flow-controller.js';
import { SIGNALS } from './kill-on-signal.js';

export type RestartDelay = number | 'exponential';

/**
 * Restarts commands that fail up to a defined number of times, unless the main concurrently process
 * has received a signal.
 */
export class RestartProcess implements FlowController {
    private readonly logger: Logger;
    private readonly scheduler?: Rx.SchedulerLike;
    private readonly delay: RestartDelay;
    private readonly process: EventEmitter;
    readonly tries: number;

    constructor({
        delay,
        tries,
        logger,
        scheduler,
        process = globalThis.process,
    }: {
        delay?: RestartDelay;
        tries?: number;
        logger: Logger;
        scheduler?: Rx.SchedulerLike;
        /**
         * The process whose signals stop commands from restarting.
         */
        process?: EventEmitter;
    }) {
        this.logger = logger;
        this.delay = delay ?? 0;
        this.tries = tries != null ? +tries : defaults.restartTries;
        this.tries = this.tries < 0 ? Infinity : this.tries;
        this.scheduler = scheduler;
        this.process = process;
    }

    handle(commands: Command[]) {
        if (this.tries === 0) {
            return { commands };
        }

        // A signal means concurrently is shutting down, so a command restarted from then on would
        // outlive it.
        let stopping = false;
        const stop = new Rx.Subject<void>();
        const signalListener = () => {
            stopping = true;
            stop.next();
        };
        SIGNALS.forEach((signal) => this.process.on(signal, signalListener));

        const delayOperator = delayWhen<CloseEvent>((_, index) => {
            const { delay } = this;
            const value = delay === 'exponential' ? 2 ** index * 1000 : delay;
            return Rx.race(Rx.timer(value, this.scheduler), stop);
        });

        // The close event of a failure that was waiting to restart when a signal arrived. It was held
        // back for that restart, so without this concurrently would wait for the command forever.
        const cancelledRestarts = commands.map(() => new Rx.Subject<CloseEvent>());

        commands
            .map((command) =>
                command.close.pipe(
                    take(this.tries),
                    takeWhile(({ exitCode }) => exitCode !== 0 && !stopping),
                ),
            )
            .forEach((failure, index) =>
                Rx.merge(
                    // Delay the emission (so that the restarts happen on time),
                    // explicitly telling the subscriber that a restart is needed
                    failure.pipe(delayOperator),
                    // Skip the first N emissions (as these would be duplicates of the above),
                    // meaning it will be empty because of success, or failed all N times,
                    // and no more restarts should be attempted.
                    failure.pipe(
                        skip(this.tries),
                        map(() => undefined),
                        defaultIfEmpty(undefined),
                    ),
                ).subscribe((closeEvent) => {
                    if (!closeEvent) {
                        return;
                    }

                    if (stopping) {
                        cancelledRestarts[index].next(closeEvent);
                        return;
                    }

                    const command = commands[index];
                    this.logger.logCommandEvent(`${command.command} restarted`, command);
                    command.start();
                }),
            );

        return {
            commands: commands.map((command, index) => {
                const closeStream = command.close.pipe(
                    filter(({ exitCode }, emission) => {
                        // We let all success codes pass, and failures only after restarting won't happen again
                        return exitCode === 0 || emission >= this.tries || stopping;
                    }),
                    mergeWith(cancelledRestarts[index]),
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
            onFinish: () => {
                // Avoids MaxListenersExceededWarning when running programmatically
                SIGNALS.forEach((signal) => this.process.off(signal, signalListener));
            },
        };
    }
}
