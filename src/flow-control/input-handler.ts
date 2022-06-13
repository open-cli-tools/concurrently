import * as Rx from 'rxjs';
import { map } from 'rxjs/operators';
import { Readable } from 'stream';
import { Command, CommandIdentifier } from '../command';
import * as defaults from '../defaults';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';

/**
 * Sends input from concurrently through to commands.
 *
 * Input can start with a command identifier, in which case it will be sent to that specific command.
 * For instance, `0:bla` will send `bla` to command at index `0`, and `server:stop` will send `stop`
 * to command with name `server`.
 *
 * If the input doesn't start with a command identifier, it is then always sent to the default target.
 */
export class InputHandler implements FlowController {
    private readonly logger: Logger;
    private readonly defaultInputTarget: CommandIdentifier;
    private readonly inputStream: Readable;
    private readonly pauseInputStreamOnFinish: boolean;

    constructor({
        defaultInputTarget,
        inputStream,
        pauseInputStreamOnFinish,
        logger,
    }: {
        inputStream: Readable;
        logger: Logger;
        defaultInputTarget?: CommandIdentifier;
        pauseInputStreamOnFinish?: boolean;
    }) {
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
                const dataParts = data.split(/:(.+)/);
                const targetId = dataParts.length > 1 ? dataParts[0] : this.defaultInputTarget;
                const input = dataParts[1] || data;

                const command = commands.find(
                    command =>
                        command.name === targetId ||
                        command.index.toString() === targetId.toString()
                );

                if (command && command.stdin) {
                    command.stdin.write(input);
                } else {
                    this.logger.logGlobalEvent(
                        `Unable to find command ${targetId}, or it has no stdin open\n`
                    );
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
}
