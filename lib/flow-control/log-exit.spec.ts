import { beforeEach, expect, it } from 'vitest';

import { createMockInstance } from '../__fixtures__/create-mock-instance.js';
import { createFakeCloseEvent, FakeCommand } from '../__fixtures__/fake-command.js';
import { Logger } from '../logger.js';
import { LogExit } from './log-exit.js';

let controller: LogExit;
let logger: Logger;
let commands: FakeCommand[];
beforeEach(() => {
    commands = [new FakeCommand(), new FakeCommand()];

    logger = createMockInstance(Logger);
    controller = new LogExit({ logger });
});

it('returns same commands', () => {
    expect(controller.handle(commands)).toMatchObject({ commands });
});

it('logs the close event of each command', () => {
    controller.handle(commands);

    commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));
    commands[1].close.next(createFakeCloseEvent({ exitCode: 'SIGTERM' }));

    expect(logger.logCommandEvent).toHaveBeenCalledTimes(2);
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[0].command} exited with code 0`,
        commands[0],
    );
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[1].command} exited with code SIGTERM`,
        commands[1],
    );
});

it('does not log close events while shutting down', () => {
    const shuttingDownController = new LogExit({ logger, isShuttingDown: () => true });
    shuttingDownController.handle(commands);

    commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));
    commands[1].close.next(createFakeCloseEvent({ exitCode: 'SIGINT' }));

    expect(logger.logCommandEvent).not.toHaveBeenCalled();
});

it('logs close events when not shutting down', () => {
    const shuttingDownController = new LogExit({ logger, isShuttingDown: () => false });
    shuttingDownController.handle(commands);

    commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));

    expect(logger.logCommandEvent).toHaveBeenCalledTimes(1);
});
