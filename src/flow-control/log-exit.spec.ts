import { createMockInstance } from 'jest-create-mock-instance';
import { Logger } from '../logger';
import { LogExit } from './log-exit';
import { createFakeCommand } from './fixtures/fake-command';

let controller, logger, commands;
beforeEach(() => {
    commands = [
        createFakeCommand(),
        createFakeCommand(),
    ];

    logger = createMockInstance(Logger);
    controller = new LogExit({ logger });
});

it('returns same commands', () => {
    expect(controller.handle(commands)).toMatchObject({ commands });
});

it('logs the close event of each command', () => {
    controller.handle(commands);

    commands[0].close.next({ exitCode: 0 });
    commands[1].close.next({ exitCode: 'SIGTERM' });

    expect(logger.logCommandEvent).toHaveBeenCalledTimes(2);
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[0].command} exited with code 0`,
        commands[0]
    );
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[1].command} exited with code SIGTERM`,
        commands[1]
    );
});
