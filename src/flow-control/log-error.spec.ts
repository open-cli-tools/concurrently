import { createMockInstance } from "jest-create-mock-instance";
import { FakeCommand } from "../fixtures/fake-command";
import Logger from "../logger";
import { LogError } from './log-error';

let controller: LogError;
let logger: Logger;
let commands: FakeCommand[];
beforeEach(() => {
    commands = [
        new FakeCommand(),
        new FakeCommand(),
    ];

    logger = createMockInstance(Logger);
    controller = new LogError({ logger });
});

it('returns same commands', () => {
    expect(controller.handle(commands)).toMatchObject({ commands });
});

it('logs the error event of each command', () => {
    controller.handle(commands);
    commands[0].error.next('error from command 0');

    const error = new Error('some error message');
    commands[1].error.next(error);

    expect(logger.logCommandEvent).toHaveBeenCalledTimes(4);
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `Error occurred when executing command: ${commands[0].command}`,
        commands[0]
    );
    expect(logger.logCommandEvent).toHaveBeenCalledWith('error from command 0', commands[0]);

    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `Error occurred when executing command: ${commands[1].command}`,
        commands[1]
    );
    expect(logger.logCommandEvent).toHaveBeenCalledWith(error.stack, commands[1]);
});
