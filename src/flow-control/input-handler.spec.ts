import { createMockInstance } from 'jest-create-mock-instance';
import { PassThrough } from 'stream';

import { Command } from '../command';
import { FakeCommand } from '../fixtures/fake-command';
import { Logger } from '../logger';
import { InputHandler } from './input-handler';

let commands: Command[];
let controller: InputHandler;
let inputStream: PassThrough;
let logger: Logger;

beforeEach(() => {
    commands = [new FakeCommand('foo', 'echo foo', 0), new FakeCommand('bar', 'echo bar', 1)];
    inputStream = new PassThrough();
    logger = createMockInstance(Logger);
    controller = new InputHandler({
        defaultInputTarget: 0,
        inputStream,
        logger,
    });
});

it('returns same commands', () => {
    expect(controller.handle(commands)).toMatchObject({ commands });

    controller = new InputHandler({ logger, inputStream });
    expect(controller.handle(commands)).toMatchObject({ commands });
});

it('does nothing if called without input stream', () => {
    new InputHandler({
        defaultInputTarget: 0,
        inputStream: undefined,
        logger,
    }).handle(commands);
    inputStream.write('something');

    expect(commands[0].stdin?.write).not.toHaveBeenCalled();
});

it('forwards input stream to default target ID', () => {
    controller.handle(commands);

    inputStream.write('something');

    expect(commands[0].stdin?.write).toHaveBeenCalledTimes(1);
    expect(commands[0].stdin?.write).toHaveBeenCalledWith('something');
    expect(commands[1].stdin?.write).not.toHaveBeenCalled();
});

it('forwards input stream to target index specified in input', () => {
    controller.handle(commands);

    inputStream.write('1:something');
    inputStream.write(' 1:ignore_leading_whitespace');
    inputStream.write('1:multi\nline\n');

    expect(commands[0].stdin?.write).not.toHaveBeenCalled();
    expect(commands[1].stdin?.write).toHaveBeenCalledTimes(3);
    expect(commands[1].stdin?.write).toHaveBeenCalledWith('something');
    expect(commands[1].stdin?.write).toHaveBeenCalledWith('ignore_leading_whitespace');
    expect(commands[1].stdin?.write).toHaveBeenCalledWith('multi\nline\n');
});

it('forwards input stream to target index specified in input when input contains colon', () => {
    controller.handle(commands);

    inputStream.emit('data', Buffer.from('1:some:thing'));
    inputStream.emit('data', Buffer.from('1: :something'));
    inputStream.emit('data', Buffer.from('1::something')); // double colon is NOT forwarded

    expect(commands[0].stdin?.write).toHaveBeenCalledTimes(1);
    expect(commands[0].stdin?.write).toHaveBeenCalledWith('1::something');
    expect(commands[1].stdin?.write).toHaveBeenCalledTimes(2);
    expect(commands[1].stdin?.write).toHaveBeenCalledWith('some:thing');
    expect(commands[1].stdin?.write).toHaveBeenCalledWith(' :something');
});

it('does not forward input stream when input contains colon in a different format', () => {
    controller.handle(commands);

    inputStream.emit('data', Buffer.from('Ruby0::Const::Syntax'));
    inputStream.emit('data', Buffer.from('1:Ruby1::Const::Syntax'));
    inputStream.emit('data', Buffer.from('ruby_symbol_arg :my_symbol'));
    inputStream.emit('data', Buffer.from('ruby_symbol_arg(:my_symbol)'));
    inputStream.emit('data', Buffer.from('{ruby_key: :my_val}'));
    inputStream.emit('data', Buffer.from('{:ruby_key=>:my_val}'));
    inputStream.emit('data', Buffer.from('js_obj = {key: "my_val"}'));

    expect(commands[1].stdin?.write).toHaveBeenCalledTimes(1);
    expect(commands[1].stdin?.write).toHaveBeenCalledWith('Ruby1::Const::Syntax');
    expect(commands[0].stdin?.write).toHaveBeenCalledTimes(6);
    expect(commands[0].stdin?.write).toHaveBeenCalledWith('Ruby0::Const::Syntax');
    expect(commands[0].stdin?.write).toHaveBeenCalledWith('ruby_symbol_arg :my_symbol');
    expect(commands[0].stdin?.write).toHaveBeenCalledWith('ruby_symbol_arg(:my_symbol)');
    expect(commands[0].stdin?.write).toHaveBeenCalledWith('{ruby_key: :my_val}');
    expect(commands[0].stdin?.write).toHaveBeenCalledWith('{:ruby_key=>:my_val}');
    expect(commands[0].stdin?.write).toHaveBeenCalledWith('js_obj = {key: "my_val"}');
});

it('forwards input stream to target name specified in input', () => {
    controller.handle(commands);

    inputStream.write('bar:something');

    expect(commands[0].stdin?.write).not.toHaveBeenCalled();
    expect(commands[1].stdin?.write).toHaveBeenCalledTimes(1);
    expect(commands[1].stdin?.write).toHaveBeenCalledWith('something');
});

it('logs error if command has no stdin open', () => {
    commands[0].stdin = undefined;
    controller.handle(commands);

    inputStream.write('something');

    expect(commands[1].stdin?.write).not.toHaveBeenCalled();
    expect(logger.logGlobalEvent).toHaveBeenCalledWith(
        'Unable to find command 0, or it has no stdin open\n'
    );
});

it('logs error if command is not found', () => {
    controller.handle(commands);

    inputStream.write('foobar:something');

    expect(commands[0].stdin?.write).not.toHaveBeenCalled();
    expect(commands[1].stdin?.write).not.toHaveBeenCalled();
    expect(logger.logGlobalEvent).toHaveBeenCalledWith(
        'Unable to find command foobar, or it has no stdin open\n'
    );
});

it('pauses input stream when finished', () => {
    expect(inputStream.readableFlowing).toBeNull();

    const { onFinish } = controller.handle(commands);
    expect(inputStream.readableFlowing).toBe(true);

    expect(onFinish).toBeDefined();
    onFinish?.();
    expect(inputStream.readableFlowing).toBe(false);
});

it('does not pause input stream when pauseInputStreamOnFinish is set to false', () => {
    controller = new InputHandler({ logger, inputStream, pauseInputStreamOnFinish: false });

    expect(inputStream.readableFlowing).toBeNull();

    const { onFinish } = controller.handle(commands);
    expect(inputStream.readableFlowing).toBe(true);

    expect(onFinish).toBeDefined();
    onFinish?.();
    expect(inputStream.readableFlowing).toBe(true);
});
