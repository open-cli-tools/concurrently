import * as Rx from 'rxjs';

import { Command, SpawnCommand } from '../command.js';
import { Logger } from '../logger.js';
import { getSpawnOpts, spawn as baseSpawn } from '../spawn.js';
import { FlowController } from './flow-controller.js';

export class Teardown implements FlowController {
    private readonly logger: Logger;
    private readonly spawn: SpawnCommand;
    private readonly teardown: readonly string[];

    constructor({
        logger,
        spawn,
        commands,
    }: {
        logger: Logger;
        /**
         * Which function to use to spawn commands.
         * Defaults to the same used by the rest of concurrently.
         */
        spawn?: SpawnCommand;
        commands: readonly string[];
    }) {
        this.logger = logger;
        this.spawn = spawn || baseSpawn;
        this.teardown = commands;
    }

    handle(commands: Command[]): { commands: Command[]; onFinish: () => Promise<void> } {
        const { logger, teardown, spawn } = this;
        const onFinish = async () => {
            if (!teardown.length) {
                return;
            }

            for (const command of teardown) {
                logger.logGlobalEvent(`Running teardown command "${command}"`);

                const child = spawn(command, getSpawnOpts({ stdio: 'raw' }));
                const error = Rx.fromEvent(child, 'error');
                const close = Rx.fromEvent(child, 'close');

                try {
                    const [exitCode, signal] = await Promise.race([
                        Rx.firstValueFrom(error).then((event) => {
                            throw event;
                        }),
                        Rx.firstValueFrom(close).then(
                            (event) => event as [number | null, NodeJS.Signals | null],
                        ),
                    ]);

                    logger.logGlobalEvent(
                        `Teardown command "${command}" exited with code ${exitCode ?? signal}`,
                    );

                    if (signal === 'SIGINT') {
                        break;
                    }
                } catch (error) {
                    const errorText = String(error instanceof Error ? error.stack || error : error);
                    logger.logGlobalEvent(`Teardown command "${command}" errored:`);
                    logger.logGlobalEvent(errorText);
                    return Promise.reject();
                }
            }
        };

        return { commands, onFinish };
    }
}
