import EventEmitter from 'events';
import { map } from 'rxjs/operators';

import { Command } from '../command';
import { FlowController } from './flow-controller';

const SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;

/**
 * Watches the main concurrently process for signals and sends the same signal down to each spawned
 * command.
 */
export class KillOnSignal implements FlowController {
    private readonly process: EventEmitter;
    private readonly abortController?: AbortController;

    constructor({
        process,
        abortController,
    }: {
        process: EventEmitter;
        abortController?: AbortController;
    }) {
        this.process = process;
        this.abortController = abortController;
    }

    handle(commands: Command[]) {
        let caughtSignal: NodeJS.Signals;
        const signalListener = (signal: NodeJS.Signals) => {
            caughtSignal = signal;
            this.abortController?.abort();
            commands.forEach((command) => command.kill(signal));
        };
        SIGNALS.forEach((signal) => this.process.on(signal, signalListener));

        return {
            commands: commands.map((command) => {
                const closeStream = command.close.pipe(
                    map((exitInfo) => {
                        const exitCode = caughtSignal === 'SIGINT' ? 0 : exitInfo.exitCode;
                        return { ...exitInfo, exitCode };
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
            onFinish: () => {
                // Avoids MaxListenersExceededWarning when running programmatically
                SIGNALS.forEach((signal) => this.process.off(signal, signalListener));
            },
        };
    }
}
