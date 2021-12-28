import { Writable } from 'stream';
import { createMockInstance } from 'jest-create-mock-instance';
import { Command } from './command';
import { OutputWriter } from './output-writer';

function createWriter(overrides=null) {
    const options = Object.assign({
        outputStream,
        group: false,
        commands,
    }, overrides);
    return new OutputWriter(options);
}

const createCommand = (index: number) => new Command(
    { index, name: '', command: 'echo foo' },
    {},
    jest.fn(),
    jest.fn(),
);

function closeCommand(command) {
    command.exited = true;
    command.close.next(command);
}

let outputStream: jest.Mocked<Writable>;
let commands: Command[];
beforeEach(() => {
    outputStream = createMockInstance(Writable);
    commands = [createCommand(0), createCommand(1), createCommand(2)]
});

describe('#write group=false', () => {
    it('writes instantly', () => {
        const writer = createWriter({ group: false });
        writer.write(commands[2], 'hello');
        expect(outputStream.write).toHaveBeenCalledTimes(1);
        expect(outputStream.write).toHaveBeenCalledWith('hello');
    });
});

describe('#write group=true', () => {
    it('writes for null commands', () => {
        const writer = createWriter({ group: true });
        writer.write(null, 'hello');
        expect(outputStream.write).toHaveBeenCalledTimes(1);
        expect(outputStream.write).toHaveBeenCalledWith('hello');
    });

    it('does not write instantly for non-active command', () => {
        const writer = createWriter({ group: true });
        writer.write(commands[2], 'hello');
        expect(outputStream.write).toHaveBeenCalledTimes(0);
        expect(writer.buffers[2]).toEqual(['hello']);
    });

    it('write instantly for active command', () => {
        const writer = createWriter({ group: true });
        writer.write({index: 0}, 'hello');
        expect(outputStream.write).toHaveBeenCalledTimes(1);
        expect(outputStream.write).toHaveBeenCalledWith('hello');
    });

    it('does not wait for write from next command to flush', () => {
        const writer = createWriter({ group: true });
        writer.write(commands[1], 'hello');
        writer.write(commands[1], 'foo bar');
        expect(outputStream.write).toHaveBeenCalledTimes(0);
        closeCommand(commands[0]);
        expect(outputStream.write).toHaveBeenCalledTimes(2);
        expect(writer.activeCommandIndex).toBe(1);
        outputStream.write.mockClear();

        writer.write({index: 1}, 'blah');
        expect(outputStream.write).toHaveBeenCalledTimes(1);
    });

    it('does not flush for non-active command', () => {
        const writer = createWriter({ group: true });
        writer.write(commands[1], 'hello');
        writer.write(commands[1], 'foo bar');
        expect(outputStream.write).toHaveBeenCalledTimes(0);
        closeCommand(commands[1]);
        expect(outputStream.write).toHaveBeenCalledTimes(0);
        closeCommand(commands[0]);
        expect(outputStream.write).toHaveBeenCalledTimes(2);
    });

    it('flushes multiple commands at a time if necessary', () => {
        const writer = createWriter({ group: true });
        writer.write({index: 2}, 'hello');
        closeCommand(commands[1]);
        closeCommand(commands[2]);
        expect(outputStream.write).toHaveBeenCalledTimes(0);
        closeCommand(commands[0]);
        expect(outputStream.write).toHaveBeenCalledTimes(1);
        expect(outputStream.write).toHaveBeenCalledWith('hello');
        expect(writer.activeCommandIndex).toBe(2);
    });
});
