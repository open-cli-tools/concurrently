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

describe('with hideEmptyLines', () => {
    beforeEach(() => {
        controller = new LogOutput({ logger, hideEmptyLines: true });
    });

    it('does not hide empty lines by default', () => {
        controller = new LogOutput({ logger });
        controller.handle(commands);

        commands[0].stdout.next(Buffer.from('foo\n\nbar\n'));

        expect(logger.logCommandText).toHaveBeenCalledWith('foo\n\nbar\n', commands[0]);
    });

    it.each(['stdout', 'stderr'] as const)('hides empty lines from %s', (stream) => {
        controller.handle(commands);

        commands[0][stream].next(Buffer.from('foo\n\n\nbar\n\n'));

        expect(logger.logCommandText).toHaveBeenCalledTimes(1);
        expect(logger.logCommandText).toHaveBeenCalledWith('foo\nbar\n', commands[0]);
    });

    it('hides whitespace-only lines', () => {
        controller.handle(commands);

        commands[0].stdout.next(Buffer.from('foo\n  \t\n\r\nbar\r\n'));

        expect(logger.logCommandText).toHaveBeenCalledWith('foo\nbar\r\n', commands[0]);
    });

    it('keeps leading whitespace of lines with content', () => {
        controller.handle(commands);

        commands[0].stdout.next(Buffer.from('  foo\n\tbar\n'));

        expect(logger.logCommandText).toHaveBeenCalledWith('  foo\n\tbar\n', commands[0]);
    });

    it('does not log chunks that only contain empty lines', () => {
        controller.handle(commands);

        commands[0].stdout.next(Buffer.from('\n'));
        commands[0].stdout.next(Buffer.from('  \n\n'));

        expect(logger.logCommandText).not.toHaveBeenCalled();
    });

    it('hides empty lines split across chunks', () => {
        controller.handle(commands);

        commands[0].stdout.next(Buffer.from('foo'));
        commands[0].stdout.next(Buffer.from('\n'));
        commands[0].stdout.next(Buffer.from('\n  '));
        commands[0].stdout.next(Buffer.from('\nbar\n'));

        expect(logger.logCommandText).toHaveBeenCalledTimes(3);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(1, 'foo', commands[0]);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(2, '\n', commands[0]);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(3, 'bar\n', commands[0]);
    });

    it('logs whitespace held from a previous chunk once the line has content', () => {
        controller.handle(commands);

        commands[0].stdout.next(Buffer.from('foo\n  '));
        commands[0].stdout.next(Buffer.from('bar\n'));

        expect(logger.logCommandText).toHaveBeenNthCalledWith(1, 'foo\n', commands[0]);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(2, '  bar\n', commands[0]);
    });

    it('tracks lines of each command and stream separately', () => {
        controller.handle(commands);

        commands[0].stdout.next(Buffer.from('foo'));
        commands[1].stdout.next(Buffer.from('\n'));
        commands[0].stderr.next(Buffer.from('\n'));
        commands[0].stdout.next(Buffer.from('\n'));

        expect(logger.logCommandText).toHaveBeenCalledTimes(2);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(1, 'foo', commands[0]);
        expect(logger.logCommandText).toHaveBeenNthCalledWith(2, '\n', commands[0]);
    });
});
