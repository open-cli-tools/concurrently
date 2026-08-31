import { Buffer } from 'node:buffer';

import { beforeEach, describe, expect, it } from 'vitest';

import { createMockInstance } from '../__fixtures__/create-mock-instance.js';
import { FakeCommand } from '../__fixtures__/fake-command.js';
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

it('preserves empty lines by default', () => {
    controller.handle(commands);

    commands[0].stdout.next(Buffer.from('\n'));

    expect(logger.logCommandText).toHaveBeenCalledExactlyOnceWith('\n', commands[0]);
});

describe('with hideEmptyLines=true', () => {
    beforeEach(() => {
        controller = new LogOutput({ logger, hideEmptyLines: true });
    });

    it('removes empty lines across chunks', () => {
        controller.handle(commands);

        commands[0].stdout.next(Buffer.from('foo\n'));
        commands[0].stdout.next(Buffer.from('\nbar\n\n'));

        expect(logger.logCommandText).toHaveBeenCalledTimes(2);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(1, 'foo\n', commands[0]);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(2, 'bar\n', commands[0]);
    });

    it('preserves lines containing whitespace', () => {
        controller.handle(commands);

        commands[0].stdout.next(Buffer.from('\n \n\t\n'));

        expect(logger.logCommandText).toHaveBeenCalledExactlyOnceWith(' \n\t\n', commands[0]);
    });

    it('tracks each command and output stream independently', () => {
        controller.handle(commands);

        commands[0].stdout.next(Buffer.from('foo'));
        commands[1].stdout.next(Buffer.from('\nbar'));
        commands[0].stderr.next(Buffer.from('\nbaz'));
        commands[0].stdout.next(Buffer.from('\nqux'));

        expect(logger.logCommandText).toHaveBeenCalledTimes(4);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(1, 'foo', commands[0]);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(2, 'bar', commands[1]);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(3, 'baz', commands[0]);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(4, '\nqux', commands[0]);
    });

    it('handles CRLF sequences split across chunks', () => {
        controller.handle(commands);

        commands[0].stdout.next(Buffer.from('\r'));
        commands[0].stdout.next(Buffer.from('\nfoo\r\n\r'));
        commands[0].stdout.next(Buffer.from('\nbar\r'));
        commands[0].close.next({} as never);

        expect(logger.logCommandText).toHaveBeenCalledTimes(3);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(1, 'foo\r\n', commands[0]);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(2, 'bar', commands[0]);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(3, '\r', commands[0]);
    });

    it('preserves a standalone carriage return', () => {
        controller.handle(commands);

        commands[0].stdout.next(Buffer.from('\r'));
        commands[0].stdout.next(Buffer.from('progress'));

        expect(logger.logCommandText).toHaveBeenCalledExactlyOnceWith('\rprogress', commands[0]);
    });

    it('starts each process run with fresh line state', () => {
        controller.handle(commands);

        commands[0].stdout.next(Buffer.from('first'));
        commands[0].close.next({} as never);
        commands[0].stdout.next(Buffer.from('\nsecond'));

        expect(logger.logCommandText).toHaveBeenCalledTimes(2);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(1, 'first', commands[0]);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(2, 'second', commands[0]);
    });
});
