const EventEmitter = require('events');
const { Writable } = require('stream');

const createFakeCommand = require('./flow-control/fixtures/fake-command');
const concurrently = require('./concurrently');

let spawn, kill, controllers;
const create = (commands, options = {}) => concurrently(
    commands,
    Object.assign(options, { controllers, spawn, kill })
);

const createProcess = (pid = 1) => {
    const process = new EventEmitter();
    process.pid = pid;
    return process;
};

beforeEach(() => {
    spawn = jest.fn(() => createProcess(1));
    kill = jest.fn();
    controllers = [{ handle: jest.fn(arg => arg) }, { handle: jest.fn(arg => arg) }];
});

it('fails if commands is not an array', () => {
    const bomb = () => create('foo');
    expect(bomb).toThrowError();
});

it('fails if no commands were provided', () => {
    const bomb = () => create([]);
    expect(bomb).toThrowError();
});

it('spawns all commands', () => {
    create(['echo', 'kill']);
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(spawn).toHaveBeenCalledWith('echo', expect.objectContaining({}));
    expect(spawn).toHaveBeenCalledWith('kill', expect.objectContaining({}));
});

it('spawns commands up to configured limit at once', () => {
    const process1 = createProcess(1);
    const process2 = createProcess(2);
    const process3 = createProcess(3);
    spawn
        .mockReturnValueOnce(process1)
        .mockReturnValueOnce(process2)
        .mockReturnValueOnce(process3);

    create(['foo', 'bar', 'baz'], { maxProcesses: 2 });
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(spawn).toHaveBeenCalledWith('foo', expect.objectContaining({}));
    expect(spawn).toHaveBeenCalledWith('bar', expect.objectContaining({}));

    process2.emit('close', 1, null);
    expect(spawn).toHaveBeenCalledTimes(3);
    expect(spawn).toHaveBeenCalledWith('baz', expect.objectContaining({}));
});

it('runs controllers with the commands', () => {
    create(['echo', '"echo wrapped"']);

    controllers.forEach(controller => {
        expect(controller.handle).toHaveBeenCalledWith([
            expect.objectContaining({ command: 'echo', index: 0 }),
            expect.objectContaining({ command: 'echo wrapped', index: 1 }),
        ]);
    });
});

it('runs commands with a name or prefix color', () => {
    create([
        { command: 'echo', prefixColor: 'red', name: 'foo' },
        'kill'
    ]);

    controllers.forEach(controller => {
        expect(controller.handle).toHaveBeenCalledWith([
            expect.objectContaining({ command: 'echo', index: 0, name: 'foo', prefixColor: 'red' }),
            expect.objectContaining({ command: 'kill', index: 1, name: '', prefixColor: '' }),
        ]);
    });
});

it('passes commands wrapped from a controller to the next one', () => {
    const fakeCommand = createFakeCommand('banana', 'banana');
    controllers[0].handle.mockReturnValue([fakeCommand]);

    create(['echo']);

    expect(controllers[0].handle).toHaveBeenCalledWith([
        expect.objectContaining({ command: 'echo', index: 0 })
    ]);

    expect(controllers[1].handle).toHaveBeenCalledWith([fakeCommand]);

    expect(fakeCommand.start).toHaveBeenCalledTimes(1);
});
