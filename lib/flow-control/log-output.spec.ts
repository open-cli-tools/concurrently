import { Buffer } from 'node:buffer';

import { beforeEach, expect, it } from 'vitest';

import { createMockInstance } from '../__fixtures__/create-mock-instance.js';
import { createFakeCloseEvent, FakeCommand } from '../__fixtures__/fake-command.js';
import { Logger } from '../logger.js';
import { LogOutput } from './log-output.js';

let controller: LogOutput;
let logger: Logger;
let commands: FakeCommand[];
beforeEach(() => {
    commands = [new FakeCommand(), new FakeCommand()];

    logger = createMockInstance(Logger);
    controller = new LogOutput({ logger });
});

it('returns same commands', () => {
    expect(controller.handle(commands)).toMatchObject({ commands });
});

it('logs the stdout of each command', () => {
    controller.handle(commands);

    commands[0].stdout.next(Buffer.from('foo'));
    commands[1].stdout.next(Buffer.from('bar'));

    expect(logger.logCommandText).toHaveBeenCalledTimes(2);
    expect(logger.logCommandText).toHaveBeenCalledWith('foo', commands[0]);
    expect(logger.logCommandText).toHaveBeenCalledWith('bar', commands[1]);
});

it('logs the stderr of each command', () => {
    controller.handle(commands);

    commands[0].stderr.next(Buffer.from('foo'));
    commands[1].stderr.next(Buffer.from('bar'));

    expect(logger.logCommandText).toHaveBeenCalledTimes(2);
    expect(logger.logCommandText).toHaveBeenCalledWith('foo', commands[0]);
    expect(logger.logCommandText).toHaveBeenCalledWith('bar', commands[1]);
});

it('decodes multi-byte characters split across stdout chunks', () => {
    controller.handle(commands);

    const bytes = Buffer.from('Café 日本\n');
    const split = bytes.indexOf(0xe6) + 1;
    commands[0].stdout.next(bytes.subarray(0, split));
    commands[0].stdout.next(bytes.subarray(split));

    expect(logger.logCommandText).toHaveBeenCalledTimes(2);
    expect(logger.logCommandText).toHaveBeenNthCalledWith(1, 'Café ', commands[0]);
    expect(logger.logCommandText).toHaveBeenNthCalledWith(2, '日本\n', commands[0]);
});

it('decodes multi-byte characters split across stderr chunks', () => {
    controller.handle(commands);

    const bytes = Buffer.from('日');
    commands[0].stderr.next(bytes.subarray(0, 1));
    commands[0].stderr.next(bytes.subarray(1, 2));
    commands[0].stderr.next(bytes.subarray(2));

    expect(logger.logCommandText).toHaveBeenCalledExactlyOnceWith('日', commands[0]);
});

it('does not mix partial characters of different streams or commands', () => {
    controller.handle(commands);

    const bytes = Buffer.from('日');
    commands[0].stdout.next(bytes.subarray(0, 1));
    commands[0].stderr.next(Buffer.from('foo'));
    commands[1].stdout.next(Buffer.from('bar'));
    commands[0].stdout.next(bytes.subarray(1));

    expect(logger.logCommandText).toHaveBeenCalledTimes(3);
    expect(logger.logCommandText).toHaveBeenNthCalledWith(1, 'foo', commands[0]);
    expect(logger.logCommandText).toHaveBeenNthCalledWith(2, 'bar', commands[1]);
    expect(logger.logCommandText).toHaveBeenNthCalledWith(3, '日', commands[0]);
});

it('flushes an incomplete character when the command closes', () => {
    controller.handle(commands);

    commands[0].stdout.next(Buffer.from('日').subarray(0, 2));
    expect(logger.logCommandText).not.toHaveBeenCalled();

    commands[0].close.next(createFakeCloseEvent());
    expect(logger.logCommandText).toHaveBeenCalledExactlyOnceWith('�', commands[0]);

    // A restarted command starts with a clean decoder
    commands[0].stdout.next(Buffer.from('日'));
    expect(logger.logCommandText).toHaveBeenLastCalledWith('日', commands[0]);
});
