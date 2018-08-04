const { createMockInstance } = require('jest-create-mock-instance');
const { TestScheduler } = require('rxjs/testing');

const Logger = require('../logger');
const createFakeCommand = require('./fixtures/fake-command');
const KillOthers = require('./kill-others');

let commands, logger, scheduler;
beforeEach(() => {
    commands = [
        createFakeCommand(),
        createFakeCommand()
    ];

    logger = createMockInstance(Logger);
    scheduler = new TestScheduler();
});

const createWithConditions = (conditions, restartTries) => new KillOthers({
    logger,
    scheduler,
    conditions,
    restartTries
});

it('does nothing if conditions are not recognized', () => {
    createWithConditions(['foo']).handle(commands).subscribe(value => {
        expect(value).toBeNull();
    });

    scheduler.flush();
});

it('does not kill others if condition does not match', () => {
    createWithConditions(['failure']).handle(commands);
    commands[1].killable = true;
    commands[0].close.next(0);

    expect(logger.logGlobalEvent).not.toHaveBeenCalled();
    expect(commands[0].kill).not.toHaveBeenCalled();
    expect(commands[1].kill).not.toHaveBeenCalled();
});

it('kills other killable processes on success', () => {
    createWithConditions(['success'], 1).handle(commands);
    commands[1].killable = true;
    commands[0].close.next(1);
    commands[0].close.next(0);

    expect(logger.logGlobalEvent).toHaveBeenCalledTimes(1);
    expect(logger.logGlobalEvent).toHaveBeenCalledWith('Sending SIGTERM to other processes..');
    expect(commands[0].kill).not.toHaveBeenCalled();
    expect(commands[1].kill).toHaveBeenCalled();
});

it('kills other killable processes on failure, after restarts attempted', () => {
    createWithConditions(['failure'], 1).handle(commands);
    commands[1].killable = true;
    commands[0].close.next(1);
    commands[0].close.next(1);

    expect(logger.logGlobalEvent).toHaveBeenCalledTimes(1);
    expect(logger.logGlobalEvent).toHaveBeenCalledWith('Sending SIGTERM to other processes..');
    expect(commands[0].kill).not.toHaveBeenCalled();
    expect(commands[1].kill).toHaveBeenCalled();
});
