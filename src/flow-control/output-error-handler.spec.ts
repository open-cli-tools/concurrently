import { Writable } from 'stream';
import { vi } from 'vitest';

import { FakeCommand } from '../fixtures/fake-command';
import { OutputErrorHandler } from './output-error-handler';

let controller: OutputErrorHandler;
let outputStream: Writable;
let abortController: AbortController;
let commands: FakeCommand[];
beforeEach(() => {
    commands = [new FakeCommand(), new FakeCommand()];

    abortController = new AbortController();
    outputStream = new Writable();
    controller = new OutputErrorHandler({ abortController, outputStream });
});

it('returns same commands', () => {
    expect(controller.handle(commands)).toMatchObject({ commands });
});

describe('on output stream error', () => {
    beforeEach(() => {
        controller.handle(commands);
        outputStream.emit('error', new Error());
    });

    it('kills every command', () => {
        expect(commands[0].kill).toHaveBeenCalled();
        expect(commands[1].kill).toHaveBeenCalled();
    });

    it('sends abort signal', () => {
        expect(abortController.signal.aborted).toBe(true);
    });
});

describe('on finish', () => {
    it('unsubscribes from output stream error', () => {
        const { onFinish } = controller.handle(commands);
        onFinish();

        outputStream.on('error', vi.fn());
        outputStream.emit('error', new Error());

        expect(commands[0].kill).not.toHaveBeenCalled();
        expect(commands[1].kill).not.toHaveBeenCalled();
        expect(abortController.signal.aborted).toBe(false);
    });
});
