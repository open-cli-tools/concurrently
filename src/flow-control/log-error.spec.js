const { createMockInstance } = require('jest-create-mock-instance');
const { TestScheduler } = require('rxjs/testing');
const Logger = require('../logger');
const LogError = require('./log-error');
const createFakeCommand = require('./fixtures/fake-command');

let controller, logger, scheduler, commands;
beforeEach(() => {
    commands = [
        createFakeCommand(),
        createFakeCommand(),
    ];

    logger = createMockInstance(Logger);
    scheduler = new TestScheduler();
    controller = new LogError({ logger, scheduler });
});

it('returns same commands', () => {
    expect(controller.handle(commands)).toBe(commands);
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
