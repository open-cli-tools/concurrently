import EventEmitter from 'events';
import { map } from 'rxjs/operators';

import { Command } from '../command';
import { FlowController } from './flow-controller';

interface KillOnSignalParams {
    process: EventEmitter;
}

const SIGNALS: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
export class KillOnSignal implements FlowController {
    private readonly process: EventEmitter;

    constructor({ process }: KillOnSignalParams) {
        this.process = process;
    }

    handle(commands: Command[]) {
        let caughtSignal: NodeJS.Signals;
        SIGNALS.forEach(signal => {
            this.process.on(signal, () => {
                caughtSignal = signal;
                commands.forEach(command => command.kill(signal));
            });
        });

        return {
            commands: commands.map(command => {
                const closeStream = command.close.pipe(map(exitInfo => {
                    const exitCode = caughtSignal === 'SIGINT' ? 0 : exitInfo.exitCode;
                    return Object.assign({}, exitInfo, { exitCode });
                }));
                return new Proxy(command, {
                    get(target, prop) {
                        return prop === 'close' ? closeStream : target[prop];
                    }
                });
            })
        };
    }
};
