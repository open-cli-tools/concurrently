import { createMockInstance } from 'jest-create-mock-instance';
import { Writable } from 'stream';
import { Subject } from 'rxjs';
import { Command } from '../../command';

export const createFakeCommand = (name = 'foo', command = 'echo foo', index = 0): Command => ({
    index,
    name,
    command,
    close: new Subject(),
    error: new Subject(),
    stderr: new Subject(),
    stdout: new Subject(),
    stdin: createMockInstance(Writable),
    start: jest.fn(),
    kill: jest.fn()
});
