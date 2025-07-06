import EventEmitter from 'events';
import { PassThrough, Writable } from 'stream';

import { ChildProcess, CloseEvent, Command, CommandInfo } from '../command';
import { createMockInstance } from './create-mock-instance';

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
            jest.fn(),
            jest.fn(),
        );

        this.stdin = createMockInstance(Writable);
        this.start = jest.fn();
        this.kill = jest.fn();
    }
}

export const createFakeProcess = (pid: number): ChildProcess =>
    Object.assign(new EventEmitter(), {
        pid,
        send: jest.fn(),
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
