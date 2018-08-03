const { createMockInstance } = require('jest-create-mock-instance');
const { TestScheduler } = require('rxjs/testing');
const Logger = require('../logger');
const LogExit = require('./log-exit');
const createFakeCommand = require('./fixtures/fake-command');

let controller, logger, scheduler, commands;
beforeEach(() => {
    commands = [
        createFakeCommand(),
        createFakeCommand(),
    ];

    logger = createMockInstance(Logger);
    scheduler = new TestScheduler();
    controller = new LogExit({ logger, scheduler });
});

it('returns empty observable', () => {
    controller.handle(commands).subscribe(value => {
        expect(value).toBe(null);
    });

    scheduler.flush();
});

it('logs the close event of each command', () => {
    controller.handle(commands);

    commands[0].close.next(0);
    commands[1].close.next('SIGTERM');

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
