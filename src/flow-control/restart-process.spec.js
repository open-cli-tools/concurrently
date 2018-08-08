const { createMockInstance } = require('jest-create-mock-instance');
const { TestScheduler } = require('rxjs/testing');

const Logger = require('../logger');
const createFakeCommand = require('./fixtures/fake-command');
const RestartProcess = require('./restart-process');

let commands, controller, logger, scheduler;
beforeEach(() => {
    commands = [
        createFakeCommand(),
        createFakeCommand()
    ];

    logger = createMockInstance(Logger);
    scheduler = new TestScheduler();
    controller = new RestartProcess({
        logger,
        scheduler,
        delay: 100,
        tries: 2
    });
});

it('does nothing if 0 tries are to be attempted', () => {
    controller = new RestartProcess({ logger, scheduler });
    controller.handle(commands).subscribe(value => {
        expect(value).toBeNull();
    });

    scheduler.flush();
});

it('finishes when all processes complete with success', () => {
    const promise = controller.handle(commands).toPromise();

    commands[0].close.next(0);
    commands[1].close.next(0);

    scheduler.flush();
    return promise;
});

it('restarts processes that fail after delay has passed', () => {
    controller.handle(commands);

    commands[0].close.next(1);
    commands[1].close.next(0);

    scheduler.flush();

    expect(logger.logCommandEvent).toHaveBeenCalledTimes(1);
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[0].command} restarted`,
        commands[0]
    );
    expect(commands[0].start).toHaveBeenCalledTimes(1);
    expect(commands[1].start).not.toHaveBeenCalled();
});

it('restarts processes up to tries', () => {
    const promise = controller.handle(commands).toPromise();

    commands[0].close.next(1);
    commands[0].close.next('SIGTERM');
    commands[0].close.next('SIGTERM');
    commands[1].close.next(0);

    scheduler.flush();

    expect(logger.logCommandEvent).toHaveBeenCalledTimes(2);
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[0].command} restarted`,
        commands[0]
    );
    expect(commands[0].start).toHaveBeenCalledTimes(2);

    return promise;
});

it('restarts processes until they succeed', () => {
    const promise = controller.handle(commands).toPromise();

    commands[0].close.next(1);
    commands[0].close.next(0);
    commands[1].close.next(0);

    scheduler.flush();

    expect(logger.logCommandEvent).toHaveBeenCalledTimes(1);
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[0].command} restarted`,
        commands[0]
    );
    expect(commands[0].start).toHaveBeenCalledTimes(1);

    return promise;
});
