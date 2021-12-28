import { TestScheduler } from "rxjs/testing";
import { CompletionListener, SuccessCondition } from "./completion-listener";
import { createFakeCloseEvent, FakeCommand } from "./fixtures/fake-command";

let commands: FakeCommand[];
let scheduler: TestScheduler;
beforeEach(() => {
    commands = [new FakeCommand('foo'), new FakeCommand('bar')];
    scheduler = new TestScheduler(() => true);
});

const createController = (successCondition?: SuccessCondition) =>
    new CompletionListener({
        successCondition,
        scheduler
    });

describe('with default success condition set', () => {
    it('succeeds if all processes exited with code 0', () => {
        const result = createController().listen(commands);

        commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));
        commands[1].close.next(createFakeCloseEvent({ exitCode: 0 }));

        scheduler.flush();

        return expect(result).resolves.toEqual(expect.anything());
    });

    it('fails if one of the processes exited with non-0 code', () => {
        const result = createController().listen(commands);

        commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));
        commands[1].close.next(createFakeCloseEvent({ exitCode: 1 }));

        scheduler.flush();

        expect(result).rejects.toEqual(expect.anything());
    });
});

describe('with success condition set to first', () => {
    it('succeeds if first process to exit has code 0', () => {
        const result = createController('first').listen(commands);

        commands[1].close.next(createFakeCloseEvent({ exitCode: 0 }));
        commands[0].close.next(createFakeCloseEvent({ exitCode: 1 }));

        scheduler.flush();

        return expect(result).resolves.toEqual(expect.anything());
    });

    it('fails if first process to exit has non-0 code', () => {
        const result = createController('first').listen(commands);

        commands[1].close.next(createFakeCloseEvent({ exitCode: 1 }));
        commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));

        scheduler.flush();

        return expect(result).rejects.toEqual(expect.anything());
    });
});

describe('with success condition set to last', () => {
    it('succeeds if last process to exit has code 0', () => {
        const result = createController('last').listen(commands);

        commands[1].close.next(createFakeCloseEvent({ exitCode: 1 }));
        commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));

        scheduler.flush();

        return expect(result).resolves.toEqual(expect.anything());
    });

    it('fails if last process to exit has non-0 code', () => {
        const result = createController('last').listen(commands);

        commands[1].close.next(createFakeCloseEvent({ exitCode: 0 }));
        commands[0].close.next(createFakeCloseEvent({ exitCode: 1 }));

        scheduler.flush();

        return expect(result).rejects.toEqual(expect.anything());
    });

});
