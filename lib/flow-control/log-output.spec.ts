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

describe('with preventClear', () => {
    beforeEach(() => {
        controller = new LogOutput({ logger, preventClear: true });
    });

    it('keeps clear sequences by default', () => {
        controller = new LogOutput({ logger });
        controller.handle(commands);

        commands[0].stdout.next(Buffer.from('foo\x1Bcbar'));

        expect(logger.logCommandText).toHaveBeenCalledWith('foo\x1Bcbar', commands[0]);
    });

    it.each(['stdout', 'stderr'] as const)('removes clear sequences from %s', (stream) => {
        controller.handle(commands);

        commands[0][stream].next(Buffer.from('foo\n\x1B[2J\x1B[3J\x1B[Hbar\n'));

        expect(logger.logCommandText).toHaveBeenCalledWith('foo\nbar\n', commands[0]);
    });

    it.each([
        ['full reset', '\x1Bc'],
        ['erase display', '\x1B[J'],
        ['erase screen', '\x1B[2J'],
        ['erase scrollback', '\x1B[3J'],
        ['cursor home', '\x1B[H'],
        ['cursor to 1;1', '\x1B[1;1H'],
        ['cursor to 0;0 with f', '\x1B[0;0f'],
    ])('removes the %s sequence', (_, sequence) => {
        controller.handle(commands);

        commands[0].stdout.next(Buffer.from(`foo${sequence}bar`));

        expect(logger.logCommandText).toHaveBeenCalledWith('foobar', commands[0]);
    });

    it('keeps other escape sequences, such as colors and cursor moves', () => {
        controller.handle(commands);

        const text = '\x1B[31mred\x1B[0m\x1B[2K\x1B[5;10H\x1B[1A';
        commands[0].stdout.next(Buffer.from(text));

        expect(logger.logCommandText).toHaveBeenCalledWith(text, commands[0]);
    });

    it('does not log chunks that only contain clear sequences', () => {
        controller.handle(commands);

        commands[0].stdout.next(Buffer.from('\x1B[2J\x1B[3J\x1B[H'));

        expect(logger.logCommandText).not.toHaveBeenCalled();
    });
});
