import * as Rx from 'rxjs';
import { map } from 'rxjs/operators';

import { defaults } from '../defaults';
import { BaseHandler } from './base-handler';

export class InputHandler extends BaseHandler {
    constructor({ defaultInputTarget, inputStream, pauseInputStreamOnFinish, logger }) {
        super({ logger });

        this.defaultInputTarget = defaultInputTarget || defaults.defaultInputTarget;
        this.inputStream = inputStream;
        this.pauseInputStreamOnFinish = pauseInputStreamOnFinish !== false;
    }

    handle(commands) {
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
