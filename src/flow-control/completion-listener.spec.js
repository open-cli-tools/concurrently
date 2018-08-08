const { Subject } = require('rxjs');
const { TestScheduler } = require('rxjs/testing');

const createFakeCommand = require('./fixtures/fake-command');
const CompletionListener = require('./completion-listener');

let controllers, commands, controllerReturns, scheduler;
beforeEach(() => {
    commands = [createFakeCommand('foo'), createFakeCommand('bar')];
    controllerReturns = [new Subject(), new Subject()];
    scheduler = new TestScheduler();
    controllers = [
        { handle: jest.fn(() => controllerReturns[0]) },
        { handle: jest.fn(() => controllerReturns[1]) }
    ];
});

const createController = successCondition => new CompletionListener({
    controllers,
    successCondition,
    scheduler
});

it('executes all decorated controllers with given commands', () => {
    createController('first').handle(commands);
    expect(controllers[0].handle).toHaveBeenCalledWith(commands);
    expect(controllers[1].handle).toHaveBeenCalledWith(commands);
});

describe('with default success condition set', () => {
    it('succeeds if all processes last exited with code 0', done => {
        const result = createController().handle(commands);
        result.subscribe(null, null, done);

        commands[0].close.next(1);
        commands[0].close.next(0);
        commands[1].close.next(1);
        commands[1].close.next(0);

        controllerReturns[0].next(1);
        controllerReturns[0].complete();
        controllerReturns[1].next(1);
        controllerReturns[1].complete();

        scheduler.flush();
    });

    it('fails if one of the processes last exited with non-0 code', done => {
        const result = createController().handle(commands);
        result.subscribe(null, () => done(), null);

        commands[0].close.next(0);
        commands[1].close.next(1);

        controllerReturns[0].next(1);
        controllerReturns[0].complete();
        controllerReturns[1].next(1);
        controllerReturns[1].complete();

        scheduler.flush();
    });
});


describe('with success condition set to first', () => {
    it('succeeds if first process last exited with code 0', done => {
        const result = createController('first').handle(commands);
        result.subscribe(null, null, done);

        commands[0].close.next(1);
        commands[0].close.next(0);
        commands[1].close.next(1);

        controllerReturns[0].next(1);
        controllerReturns[0].complete();
        controllerReturns[1].next(1);
        controllerReturns[1].complete();

        scheduler.flush();
    });

    it('fails if first process last exited with non-0 code', done => {
        const result = createController('first').handle(commands);
        result.subscribe(null, () => done(), null);

        commands[0].close.next(1);
        commands[1].close.next(0);

        controllerReturns[0].next(1);
        controllerReturns[0].complete();
        controllerReturns[1].next(1);
        controllerReturns[1].complete();

        scheduler.flush();
    });
});

describe('with success condition set to last', () => {
    it('succeeds if last process last exited with code 0', done => {
        const result = createController('last').handle(commands);
        result.subscribe(null, null, done);

        commands[0].close.next(1);
        commands[1].close.next(1);
        commands[1].close.next(0);

        controllerReturns[0].next(1);
        controllerReturns[0].complete();
        controllerReturns[1].next(1);
        controllerReturns[1].complete();

        scheduler.flush();
    });

    it('fails if first process last exited with non-0 code', done => {
        const result = createController('last').handle(commands);
        result.subscribe(null, () => done(), null);

        commands[0].close.next(0);
        commands[1].close.next(1);

        controllerReturns[0].next(1);
        controllerReturns[0].complete();
        controllerReturns[1].next(1);
        controllerReturns[1].complete();

        scheduler.flush();
    });
});
