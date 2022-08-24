import { createMockInstance } from 'jest-create-mock-instance';

import { FakeCommand } from '../fixtures/fake-command.js';
import { Logger } from '../logger.js';
import { LogError } from './log-error.js';

let controller: LogError;
let logger: Logger;
let commands: FakeCommand[];
beforeEach(() => {
    commands = [new FakeCommand(), new FakeCommand(), new FakeCommand()];

    logger = createMockInstance(Logger);
    controller = new LogError({ logger });
});

it('returns same commands', () => {
    expect(controller.handle(commands)).toMatchObject({ commands });
});

it('logs the error event of each command', () => {
    controller.handle(commands);
    commands[0].error.next('error from command 0');

    const error1 = new Error('some error message');
    commands[1].error.next(error1);

    // Testing Error without stack
    const error2 = new Error();
    error2.stack = '';
    commands[2].error.next(error2);

    expect(logger.logCommandEvent).toHaveBeenCalledTimes(6);
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `Error occurred when executing command: ${commands[0].command}`,
        commands[0]
    );
    expect(logger.logCommandEvent).toHaveBeenCalledWith('error from command 0', commands[0]);

    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `Error occurred when executing command: ${commands[1].command}`,
        commands[1]
    );
    expect(logger.logCommandEvent).toHaveBeenCalledWith(error1.stack, commands[1]);

    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `Error occurred when executing command: ${commands[2].command}`,
        commands[2]
    );
    expect(logger.logCommandEvent).toHaveBeenCalledWith(String(error2), commands[2]);
});
