import EventEmitter from 'events';
import { map } from 'rxjs/operators';

import { Command } from '../command.js';
import { FlowController } from './flow-controller.js';

/**
 * Watches the main concurrently process for signals and sends the same signal down to each spawned
 * command.
 */
export class KillOnSignal implements FlowController {
    private readonly process: EventEmitter;

    constructor({ process }: { process: EventEmitter }) {
        this.process = process;
    }

    handle(commands: Command[]) {
        let caughtSignal: NodeJS.Signals;
        (['SIGINT', 'SIGTERM', 'SIGHUP'] as NodeJS.Signals[]).forEach((signal) => {
            this.process.on(signal, () => {
                caughtSignal = signal;
                commands.forEach((command) => command.kill(signal));
            });
        });

        return {
            commands: commands.map((command) => {
                const closeStream = command.close.pipe(
                    map((exitInfo) => {
                        const exitCode = caughtSignal === 'SIGINT' ? 0 : exitInfo.exitCode;
                        return { ...exitInfo, exitCode };
                    })
                );
                return new Proxy(command, {
                    get(target, prop: keyof Command) {
                        return prop === 'close' ? closeStream : target[prop];
                    },
                });
            }),
        };
    }
}
