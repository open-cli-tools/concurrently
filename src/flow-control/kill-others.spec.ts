import { createMockInstance } from 'jest-create-mock-instance';

import { createFakeCloseEvent, FakeCommand } from '../fixtures/fake-command';
import { Logger } from '../logger';
import { KillOthers, ProcessCloseCondition } from './kill-others';

let commands: FakeCommand[];
let logger: Logger;
beforeEach(() => {
    commands = [new FakeCommand(), new FakeCommand()];
    logger = createMockInstance(Logger);
});

const createWithConditions = (conditions: ProcessCloseCondition[]) =>
    new KillOthers({
        logger,
        conditions,
    });

it('returns same commands', () => {
    expect(createWithConditions(['success']).handle(commands)).toMatchObject({ commands });
    expect(createWithConditions(['failure']).handle(commands)).toMatchObject({ commands });
});

it('does not kill others if condition does not match', () => {
    createWithConditions(['failure']).handle(commands);
    commands[1].isKillable = true;
    commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));

    expect(logger.logGlobalEvent).not.toHaveBeenCalled();
    expect(commands[0].kill).not.toHaveBeenCalled();
    expect(commands[1].kill).not.toHaveBeenCalled();
});

it('kills other killable processes on success', () => {
    createWithConditions(['success']).handle(commands);
    commands[1].isKillable = true;
    commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));

    expect(logger.logGlobalEvent).toHaveBeenCalledTimes(1);
    expect(logger.logGlobalEvent).toHaveBeenCalledWith('Sending SIGTERM to other processes..');
    expect(commands[0].kill).not.toHaveBeenCalled();
    expect(commands[1].kill).toHaveBeenCalled();
});

it('does nothing if called without conditions', () => {
    createWithConditions([]).handle(commands);
    commands[1].isKillable = true;
    commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));

    expect(logger.logGlobalEvent).not.toHaveBeenCalled();
    expect(commands[0].kill).not.toHaveBeenCalled();
    expect(commands[1].kill).not.toHaveBeenCalled();
});

it('kills other killable processes on failure', () => {
    createWithConditions(['failure']).handle(commands);
    commands[1].isKillable = true;
    commands[0].close.next(createFakeCloseEvent({ exitCode: 1 }));

    expect(logger.logGlobalEvent).toHaveBeenCalledTimes(1);
    expect(logger.logGlobalEvent).toHaveBeenCalledWith('Sending SIGTERM to other processes..');
    expect(commands[0].kill).not.toHaveBeenCalled();
    expect(commands[1].kill).toHaveBeenCalled();
});

it('does not try to kill processes already dead', () => {
    createWithConditions(['failure']).handle(commands);
    commands[0].close.next(createFakeCloseEvent({ exitCode: 1 }));

    expect(logger.logGlobalEvent).not.toHaveBeenCalled();
    expect(commands[0].kill).not.toHaveBeenCalled();
    expect(commands[1].kill).not.toHaveBeenCalled();
});
