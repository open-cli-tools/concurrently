import { Writable } from 'node:stream';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeCommand } from '../__fixtures__/fake-command.js';
import { OutputErrorHandler } from './output-error-handler.js';

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
        outputStream.emit('error', new Error('test'));
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
        outputStream.emit('error', new Error('test'));

        expect(commands[0].kill).not.toHaveBeenCalled();
        expect(commands[1].kill).not.toHaveBeenCalled();
        expect(abortController.signal.aborted).toBe(false);
    });
});
