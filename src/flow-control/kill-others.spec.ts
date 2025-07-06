import { createMockInstance } from '../fixtures/create-mock-instance';
import { createFakeCloseEvent, createFakeProcess, FakeCommand } from '../fixtures/fake-command';
import { Logger } from '../logger';
import { KillOthers, ProcessCloseCondition } from './kill-others';

let commands: FakeCommand[];
let logger: Logger;
let abortController: AbortController;
beforeEach(() => {
    commands = [new FakeCommand(), new FakeCommand()];
    logger = createMockInstance(Logger);
    abortController = new AbortController();
});

const createWithConditions = (
    conditions: ProcessCloseCondition[],
    opts?: { timeoutMs?: number; killSignal?: string },
) =>
    new KillOthers({
        logger,
        abortController,
        conditions,
        killSignal: undefined,
        ...opts,
    });

const assignProcess = (command: FakeCommand) => {
    const process = createFakeProcess(1);
    command.pid = process.pid;
    command.process = process;
};

const unassignProcess = (command: FakeCommand) => {
    command.pid = undefined;
    command.process = undefined;
};

it('returns same commands', () => {
    expect(createWithConditions(['success']).handle(commands)).toMatchObject({ commands });
    expect(createWithConditions(['failure']).handle(commands)).toMatchObject({ commands });
});

it('does not kill others if condition does not match', () => {
    createWithConditions(['failure']).handle(commands);
    assignProcess(commands[1]);
    commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));

    expect(logger.logGlobalEvent).not.toHaveBeenCalled();
    expect(commands[0].kill).not.toHaveBeenCalled();
    expect(commands[1].kill).not.toHaveBeenCalled();
});

describe.each(['success', 'failure'] as const)('on %s', (condition) => {
    const exitCode = condition === 'success' ? 0 : 1;
    const inversedCode = exitCode === 1 ? 0 : 1;

    it('kills other processes', () => {
        createWithConditions([condition]).handle(commands);
        assignProcess(commands[1]);
        commands[0].close.next(createFakeCloseEvent({ exitCode }));

        expect(logger.logGlobalEvent).toHaveBeenCalledTimes(1);
        expect(logger.logGlobalEvent).toHaveBeenCalledWith('Sending SIGTERM to other processes..');
        expect(commands[0].kill).not.toHaveBeenCalled();
        expect(commands[1].kill).toHaveBeenCalledWith(undefined);
    });

    it('kills other processes, with specified signal', () => {
        createWithConditions([condition], { killSignal: 'SIGKILL' }).handle(commands);
        assignProcess(commands[1]);
        commands[0].close.next(createFakeCloseEvent({ exitCode }));

        expect(logger.logGlobalEvent).toHaveBeenCalledTimes(1);
        expect(logger.logGlobalEvent).toHaveBeenCalledWith('Sending SIGKILL to other processes..');
        expect(commands[0].kill).not.toHaveBeenCalled();
        expect(commands[1].kill).toHaveBeenCalledWith('SIGKILL');
    });

    it('sends abort signal on condition match', () => {
        createWithConditions([condition]).handle(commands);
        commands[0].close.next(createFakeCloseEvent({ exitCode }));

        expect(abortController.signal.aborted).toBe(true);
    });

    it('does not send abort signal on condition mismatch', () => {
        createWithConditions([condition]).handle(commands);
        commands[0].close.next(createFakeCloseEvent({ exitCode: inversedCode }));

        expect(abortController.signal.aborted).toBe(false);
    });
});

it('does nothing if called without conditions', () => {
    createWithConditions([]).handle(commands);
    commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));

    expect(logger.logGlobalEvent).not.toHaveBeenCalled();
    expect(commands[0].kill).not.toHaveBeenCalled();
    expect(commands[1].kill).not.toHaveBeenCalled();
});

it('does not try to kill processes already dead', () => {
    createWithConditions(['failure']).handle(commands);
    commands[0].close.next(createFakeCloseEvent({ exitCode: 1 }));

    expect(logger.logGlobalEvent).not.toHaveBeenCalled();
    expect(commands[0].kill).not.toHaveBeenCalled();
    expect(commands[1].kill).not.toHaveBeenCalled();
});

it('force kills misbehaving processes after a timeout', () => {
    jest.useFakeTimers();
    commands.push(new FakeCommand());

    createWithConditions(['failure'], { timeoutMs: 500 }).handle(commands);
    assignProcess(commands[1]);
    assignProcess(commands[2]);
    commands[2].kill = jest.fn(() => unassignProcess(commands[2]));
    commands[0].close.next(createFakeCloseEvent({ exitCode: 1 }));

    jest.advanceTimersByTime(500);

    expect(commands[1].kill).toHaveBeenCalledTimes(2);
    expect(commands[1].kill).toHaveBeenCalledWith('SIGKILL');
    expect(commands[2].kill).toHaveBeenCalledTimes(1);
});
