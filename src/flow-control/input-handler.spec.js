const EventEmitter = require('events');
const { createMockInstance } = require('jest-create-mock-instance');

const Logger = require('../logger');
const createFakeCommand = require('./fixtures/fake-command');
const InputHandler = require('./input-handler');

let commands, controller, inputStream, logger;

beforeEach(() => {
    commands = [
        createFakeCommand('foo', 'echo foo', 0),
        createFakeCommand('bar', 'echo bar', 1),
    ];
    inputStream = new EventEmitter();
    logger = createMockInstance(Logger);
    controller = new InputHandler({
        defaultInputTarget: 0,
        inputStream,
        logger
    });
});

it('returns same commands', () => {
    expect(controller.handle(commands)).toBe(commands);

    controller = new InputHandler({ logger });
    expect(controller.handle(commands)).toBe(commands);
});

it('forwards input stream to default target ID', () => {
    controller.handle(commands);

    inputStream.emit('data', Buffer.from('something'));

    expect(commands[0].stdin.write).toHaveBeenCalledTimes(1);
    expect(commands[0].stdin.write).toHaveBeenCalledWith('something');
    expect(commands[1].stdin.write).not.toHaveBeenCalled();
});

it('forwards input stream to target index specified in input', () => {
    controller.handle(commands);

    inputStream.emit('data', Buffer.from('1:something'));

    expect(commands[0].stdin.write).not.toHaveBeenCalled();
    expect(commands[1].stdin.write).toHaveBeenCalledTimes(1);
    expect(commands[1].stdin.write).toHaveBeenCalledWith('something');
});

it('forwards input stream to target name specified in input', () => {
    controller.handle(commands);

    inputStream.emit('data', Buffer.from('bar:something'));

    expect(commands[0].stdin.write).not.toHaveBeenCalled();
    expect(commands[1].stdin.write).toHaveBeenCalledTimes(1);
    expect(commands[1].stdin.write).toHaveBeenCalledWith('something');
});

it('logs error if command has no stdin open', () => {
    commands[0].stdin = null;
    controller.handle(commands);

    inputStream.emit('data', Buffer.from('something'));

    expect(commands[1].stdin.write).not.toHaveBeenCalled();
    expect(logger.logGlobalEvent).toHaveBeenCalledWith('Unable to find command 0, or it has no stdin open\n');
});

it('logs error if command is not found', () => {
    controller.handle(commands);

    inputStream.emit('data', Buffer.from('foobar:something'));

    expect(commands[0].stdin.write).not.toHaveBeenCalled();
    expect(commands[1].stdin.write).not.toHaveBeenCalled();
    expect(logger.logGlobalEvent).toHaveBeenCalledWith('Unable to find command foobar, or it has no stdin open\n');
});
