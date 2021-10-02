import { createMockInstance } from 'jest-create-mock-instance';
import { Writable } from 'stream';
import { Subject } from 'rxjs';

module.exports = (name = 'foo', command = 'echo foo', index = 0) => ({
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
