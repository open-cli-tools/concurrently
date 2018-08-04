const EventEmitter = require('events');

const createFakeCommand = require('./fixtures/fake-command');
const KillOnSignal = require('./kill-on-signal');

let commands, controller, process;
beforeEach(() => {
    process = new EventEmitter();
    commands = [
        createFakeCommand(),
        createFakeCommand(),
    ];
    controller = new KillOnSignal({ process });
});

it('kills all commands on SIGINT', () => {
    controller.handle(commands);
    process.emit('SIGINT');

    expect(process.listenerCount('SIGINT')).toBe(1);
    expect(commands[0].kill).toHaveBeenCalledWith('SIGINT');
    expect(commands[1].kill).toHaveBeenCalledWith('SIGINT');
});

it('kills all commands on SIGTERM', () => {
    controller.handle(commands);
    process.emit('SIGTERM');

    expect(process.listenerCount('SIGTERM')).toBe(1);
    expect(commands[0].kill).toHaveBeenCalledWith('SIGTERM');
    expect(commands[1].kill).toHaveBeenCalledWith('SIGTERM');
});
