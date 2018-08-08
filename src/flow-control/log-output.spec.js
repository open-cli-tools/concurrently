const { createMockInstance } = require('jest-create-mock-instance');
const { TestScheduler } = require('rxjs/testing');
const Logger = require('../logger');
const LogOutput = require('./log-output');
const createFakeCommand = require('./fixtures/fake-command');

let controller, logger, scheduler, commands;
beforeEach(() => {
    commands = [
        createFakeCommand(),
        createFakeCommand(),
    ];

    logger = createMockInstance(Logger);
    scheduler = new TestScheduler();
    controller = new LogOutput({ logger, scheduler });
});

it('returns empty observable', () => {
    controller.handle(commands).subscribe(value => {
        expect(value).toBe(null);
    });

    scheduler.flush();
});

it('logs the stdout of each command', () => {
    controller.handle(commands);

    commands[0].stdout.next(Buffer.from('foo'));
    commands[1].stdout.next(Buffer.from('bar'));

    expect(logger.logCommandText).toHaveBeenCalledTimes(2);
    expect(logger.logCommandText).toHaveBeenCalledWith('foo', commands[0]);
    expect(logger.logCommandText).toHaveBeenCalledWith('bar', commands[1]);
});

it('logs the stderr of each command', () => {
    controller.handle(commands);

    commands[0].stderr.next(Buffer.from('foo'));
    commands[1].stderr.next(Buffer.from('bar'));

    expect(logger.logCommandText).toHaveBeenCalledTimes(2);
    expect(logger.logCommandText).toHaveBeenCalledWith('foo', commands[0]);
    expect(logger.logCommandText).toHaveBeenCalledWith('bar', commands[1]);
});
