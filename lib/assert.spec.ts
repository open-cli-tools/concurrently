import { afterEach, beforeEach, describe, expect, it, MockInstance, vi } from 'vitest';

import { assertDeprecated, assertNotRuntime } from './assert.js';

let consoleMock: MockInstance;
beforeEach(() => {
    consoleMock = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('assertDeprecated()', () => {
    it('prints warning with name and message when condition is false', () => {
        assertDeprecated(false, 'example-flag', 'This is an example message.');

        expect(consoleMock).toHaveBeenLastCalledWith(
            '[concurrently] example-flag is deprecated. This is an example message.',
        );
    });

    it('prints same warning only once', () => {
        assertDeprecated(false, 'example-flag', 'This is an example message.');
        assertDeprecated(false, 'different-flag', 'This is another message.');

        expect(consoleMock).toBeCalledTimes(1);
        expect(consoleMock).toHaveBeenLastCalledWith(
            '[concurrently] different-flag is deprecated. This is another message.',
        );
    });

    it('prints nothing if condition is true', () => {
        assertDeprecated(true, 'example-flag', 'This is an example message.');

        expect(consoleMock).not.toHaveBeenCalled();
    });
});

describe('assertNotRuntime()', () => {
    it('prints warning with name and message when condition is false', () => {
        assertNotRuntime(false, 'example-flag', 'This is an example message.');

        expect(consoleMock).toHaveBeenLastCalledWith(
            '[concurrently] Running via example-flag is not well supported. This is an example message.',
        );
    });

    it('prints same warning only once', () => {
        assertNotRuntime(false, 'example-flag', 'This is an example message.');
        assertNotRuntime(false, 'different-flag', 'This is another message.');

        expect(consoleMock).toBeCalledTimes(1);
        expect(consoleMock).toHaveBeenLastCalledWith(
            '[concurrently] Running via different-flag is not well supported. This is another message.',
        );
    });

    it('prints nothing if condition is true', () => {
        assertNotRuntime(true, 'example-flag', 'This is an example message.');

        expect(consoleMock).not.toHaveBeenCalled();
    });
});
