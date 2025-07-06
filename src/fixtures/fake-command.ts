import EventEmitter from 'events';
import { PassThrough, Writable } from 'stream';
import { vi } from 'vitest';

import { ChildProcess, CloseEvent, Command, CommandInfo } from '../command.js';
import { createMockInstance } from './create-mock-instance.js';

export class FakeCommand extends Command {
    constructor(name = 'foo', command = 'echo foo', index = 0, info?: Partial<CommandInfo>) {
        super(
            {
                index,
                name,
                command,
                ...info,
            },
            {},
            vi.fn(),
            vi.fn(),
        );

        this.stdin = createMockInstance(Writable);
        this.start = vi.fn();
        this.kill = vi.fn();
    }
}

export const createFakeProcess = (pid: number): ChildProcess =>
    Object.assign(new EventEmitter(), {
        pid,
        send: vi.fn(),
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough(),
    });

export const createFakeCloseEvent = (overrides?: Partial<CloseEvent>): CloseEvent => ({
    command: new FakeCommand(),
    index: 0,
    killed: false,
    exitCode: 0,
    timings: {
        startDate: new Date(),
        endDate: new Date(),
        durationSeconds: 0,
    },
    ...overrides,
});
