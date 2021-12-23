const { Writable } = require('stream');
const { createMockInstance } = require('jest-create-mock-instance');
const { Command } = require('./command');
const OutputWriter = require('./output-writer');

function createWriter(overrides=null) {
    const options = Object.assign({
        outputStream: createMockInstance(Writable),
        group: false,
        commands: [new Command({index: 0}), new Command({index: 1}), new Command({index: 2})],
    }, overrides);
    return new OutputWriter(options);
}

function closeCommand(command) {
    command.exited = true;
    command.close.next(command);
}

describe('#write group=false', () => {
    it('writes instantly', () => {
        const writer = createWriter({ group: false });
        writer.write({index: 2}, 'hello');
        expect(writer.outputStream.write).toHaveBeenCalledTimes(1);
        expect(writer.outputStream.write).toHaveBeenCalledWith('hello');
    });
});

describe('#write group=true', () => {
    it('writes for null commands', () => {
        const writer = createWriter({ group: true });
        writer.write(null, 'hello');
        expect(writer.outputStream.write).toHaveBeenCalledTimes(1);
        expect(writer.outputStream.write).toHaveBeenCalledWith('hello');
    });

    it('does not write instantly for non-active command', () => {
        const writer = createWriter({ group: true });
        writer.write({index: 2}, 'hello');
        expect(writer.outputStream.write).toHaveBeenCalledTimes(0);
        expect(writer.buffers[2]).toEqual(['hello']);
    });

    it('write instantly for active command', () => {
        const writer = createWriter({ group: true });
        writer.write({index: 0}, 'hello');
        expect(writer.outputStream.write).toHaveBeenCalledTimes(1);
        expect(writer.outputStream.write).toHaveBeenCalledWith('hello');
    });

    it('does not wait for write from next command to flush', () => {
        const writer = createWriter({ group: true });
        writer.write({index: 1}, 'hello');
        writer.write({index: 1}, 'foo bar');
        expect(writer.outputStream.write).toHaveBeenCalledTimes(0);
        closeCommand(writer.commands[0]);
        expect(writer.outputStream.write).toHaveBeenCalledTimes(2);
        expect(writer.activeCommandIndex).toBe(1);
        writer.outputStream.write.mockClear();

        writer.write({index: 1}, 'blah');
        expect(writer.outputStream.write).toHaveBeenCalledTimes(1);
    });

    it('does not flush for non-active command', () => {
        const writer = createWriter({ group: true });
        writer.write({index: 1}, 'hello');
        writer.write({index: 1}, 'foo bar');
        expect(writer.outputStream.write).toHaveBeenCalledTimes(0);
        closeCommand(writer.commands[1]);
        expect(writer.outputStream.write).toHaveBeenCalledTimes(0);
        closeCommand(writer.commands[0]);
        expect(writer.outputStream.write).toHaveBeenCalledTimes(2);
    });

    it('flushes multiple commands at a time if necessary', () => {
        const writer = createWriter({ group: true });
        writer.write({index: 2}, 'hello');
        closeCommand(writer.commands[1]);
        closeCommand(writer.commands[2]);
        expect(writer.outputStream.write).toHaveBeenCalledTimes(0);
        closeCommand(writer.commands[0]);
        expect(writer.outputStream.write).toHaveBeenCalledTimes(1);
        expect(writer.outputStream.write).toHaveBeenCalledWith('hello');
        expect(writer.activeCommandIndex).toBe(2);
    });
});
