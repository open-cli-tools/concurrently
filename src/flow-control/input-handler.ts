import { Readable } from 'stream';
import * as Rx from 'rxjs';
import { map } from 'rxjs/operators';

import { Command } from '../command';
import { defaults } from '../defaults';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';

interface InputHandlerParams {
    logger: Logger;
    inputStream?: Readable,
    defaultInputTarget?: string | number,
    pauseInputStreamOnFinish?: boolean
}

export class InputHandler implements FlowController {
    private readonly logger: Logger;
    private readonly defaultInputTarget: string | number;
    private readonly inputStream: Readable;
    private readonly pauseInputStreamOnFinish: boolean;

    constructor({ defaultInputTarget, inputStream, pauseInputStreamOnFinish, logger }: InputHandlerParams) {
        this.logger = logger;
        this.defaultInputTarget = defaultInputTarget || defaults.defaultInputTarget;
        this.inputStream = inputStream;
        this.pauseInputStreamOnFinish = pauseInputStreamOnFinish !== false;
    }

    handle(commands: Command[]) {
        if (!this.inputStream) {
            return { commands };
        }

        Rx.fromEvent(this.inputStream, 'data')
            .pipe(map(data => data.toString()))
            .subscribe(data => {
                let [targetId, input] = data.split(/:(.+)/);
                targetId = input ? targetId : this.defaultInputTarget;
                input = input || data;

                const command = commands.find(command => (
                    command.name === targetId ||
                    command.index.toString() === targetId.toString()
                ));

                if (command && command.stdin) {
                    command.stdin.write(input);
                } else {
                    this.logger.logGlobalEvent(`Unable to find command ${targetId}, or it has no stdin open\n`);
                }
            });

        return {
            commands,
            onFinish: () => {
                if (this.pauseInputStreamOnFinish) {
                    // https://github.com/kimmobrunfeldt/concurrently/issues/252
                    this.inputStream.pause();
                }
            },
        };
    }
};
