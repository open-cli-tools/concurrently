import { Buffer } from 'node:buffer';

import { beforeEach, expect, it } from 'vitest';

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
