import { TestScheduler } from 'rxjs/testing';
import { CloseEvent } from './command';
import { CompletionListener, SuccessCondition } from './completion-listener';
import { createFakeCloseEvent, FakeCommand } from './fixtures/fake-command';

let commands: FakeCommand[];
let scheduler: TestScheduler;
beforeEach(() => {
    commands = [
        new FakeCommand('foo', 'echo', 0),
        new FakeCommand('bar', 'echo', 1),
        new FakeCommand('baz', 'echo', 2),
    ];
    scheduler = new TestScheduler(() => true);
});

const createController = (successCondition?: SuccessCondition) =>
    new CompletionListener({
        successCondition,
        scheduler,
    });

const emitFakeCloseEvent = (command: FakeCommand, event?: Partial<CloseEvent>) =>
    command.close.next(createFakeCloseEvent({ ...event, command, index: command.index }));

describe('with default success condition set', () => {
    it('succeeds if all processes exited with code 0', () => {
        const result = createController().listen(commands);

        commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));
        commands[1].close.next(createFakeCloseEvent({ exitCode: 0 }));
        commands[2].close.next(createFakeCloseEvent({ exitCode: 0 }));

        scheduler.flush();

        return expect(result).resolves.toEqual(expect.anything());
    });

    it('fails if one of the processes exited with non-0 code', () => {
        const result = createController().listen(commands);

        commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));
        commands[1].close.next(createFakeCloseEvent({ exitCode: 1 }));
        commands[2].close.next(createFakeCloseEvent({ exitCode: 0 }));

        scheduler.flush();

        return expect(result).rejects.toEqual(expect.anything());
    });
});

describe('with success condition set to first', () => {
    it('succeeds if first process to exit has code 0', () => {
        const result = createController('first').listen(commands);

        commands[1].close.next(createFakeCloseEvent({ exitCode: 0 }));
        commands[0].close.next(createFakeCloseEvent({ exitCode: 1 }));
        commands[2].close.next(createFakeCloseEvent({ exitCode: 1 }));

        scheduler.flush();

        return expect(result).resolves.toEqual(expect.anything());
    });

    it('fails if first process to exit has non-0 code', () => {
        const result = createController('first').listen(commands);

        commands[1].close.next(createFakeCloseEvent({ exitCode: 1 }));
        commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));
        commands[2].close.next(createFakeCloseEvent({ exitCode: 0 }));

        scheduler.flush();

        return expect(result).rejects.toEqual(expect.anything());
    });
});

describe('with success condition set to last', () => {
    it('succeeds if last process to exit has code 0', () => {
        const result = createController('last').listen(commands);

        commands[1].close.next(createFakeCloseEvent({ exitCode: 1 }));
        commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));
        commands[2].close.next(createFakeCloseEvent({ exitCode: 0 }));

        scheduler.flush();

        return expect(result).resolves.toEqual(expect.anything());
    });

    it('fails if last process to exit has non-0 code', () => {
        const result = createController('last').listen(commands);

        commands[1].close.next(createFakeCloseEvent({ exitCode: 0 }));
        commands[0].close.next(createFakeCloseEvent({ exitCode: 1 }));
        commands[2].close.next(createFakeCloseEvent({ exitCode: 1 }));

        scheduler.flush();

        return expect(result).rejects.toEqual(expect.anything());
    });
});

describe.each([
    // Use the middle command for both cases to make it more difficult to make a mess up
    // in the implementation cause false passes.
    ['command-bar' as const, 'bar'],
    ['command-1' as const, 1],
])('with success condition set to %s', (condition, nameOrIndex) => {
    it(`succeeds if command ${nameOrIndex} exits with code 0`, () => {
        const result = createController(condition).listen(commands);

        emitFakeCloseEvent(commands[0], { exitCode: 1 });
        emitFakeCloseEvent(commands[1], { exitCode: 0 });
        emitFakeCloseEvent(commands[2], { exitCode: 1 });

        scheduler.flush();

        return expect(result).resolves.toEqual(expect.anything());
    });

    it(`succeeds if all commands ${nameOrIndex} exit with code 0`, () => {
        commands = [commands[0], commands[1], commands[1]];
        const result = createController(condition).listen(commands);

        emitFakeCloseEvent(commands[0], { exitCode: 1 });
        emitFakeCloseEvent(commands[1], { exitCode: 0 });
        emitFakeCloseEvent(commands[2], { exitCode: 0 });

        scheduler.flush();

        return expect(result).resolves.toEqual(expect.anything());
    });

    it(`fails if command ${nameOrIndex} exits with non-0 code`, () => {
        const result = createController(condition).listen(commands);

        emitFakeCloseEvent(commands[0], { exitCode: 0 });
        emitFakeCloseEvent(commands[1], { exitCode: 1 });
        emitFakeCloseEvent(commands[2], { exitCode: 0 });

        scheduler.flush();

        return expect(result).rejects.toEqual(expect.anything());
    });

    it(`fails if some commands ${nameOrIndex} exit with non-0 code`, () => {
        commands = [commands[0], commands[1], commands[1]];
        const result = createController(condition).listen(commands);

        emitFakeCloseEvent(commands[0], { exitCode: 1 });
        emitFakeCloseEvent(commands[1], { exitCode: 0 });
        emitFakeCloseEvent(commands[2], { exitCode: 1 });

        scheduler.flush();

        return expect(result).resolves.toEqual(expect.anything());
    });

    it(`fails if command ${nameOrIndex} doesn't exist`, () => {
        const result = createController(condition).listen([commands[0]]);

        emitFakeCloseEvent(commands[0], { exitCode: 0 });
        scheduler.flush();

        return expect(result).rejects.toEqual(expect.anything());
    });
});

describe.each([
    // Use the middle command for both cases to make it more difficult to make a mess up
    // in the implementation cause false passes.
    ['!command-bar' as const, 'bar'],
    ['!command-1' as const, 1],
])('with success condition set to %s', (condition, nameOrIndex) => {
    it(`succeeds if all commands but ${nameOrIndex} exit with code 0`, () => {
        const result = createController(condition).listen(commands);

        emitFakeCloseEvent(commands[0], { exitCode: 0 });
        emitFakeCloseEvent(commands[1], { exitCode: 1 });
        emitFakeCloseEvent(commands[2], { exitCode: 0 });

        scheduler.flush();

        return expect(result).resolves.toEqual(expect.anything());
    });

    it(`fails if any commands but ${nameOrIndex} exit with non-0 code`, () => {
        const result = createController(condition).listen(commands);

        emitFakeCloseEvent(commands[0], { exitCode: 1 });
        emitFakeCloseEvent(commands[1], { exitCode: 1 });
        emitFakeCloseEvent(commands[2], { exitCode: 0 });

        scheduler.flush();

        return expect(result).rejects.toEqual(expect.anything());
    });

    it(`succeeds if command ${nameOrIndex} doesn't exist`, () => {
        const result = createController(condition).listen([commands[0]]);

        emitFakeCloseEvent(commands[0], { exitCode: 0 });
        scheduler.flush();

        return expect(result).resolves.toEqual(expect.anything());
    });
});
