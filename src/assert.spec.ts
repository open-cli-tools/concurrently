import { afterEach, describe, expect, it, vi } from 'vitest';

import { assertDeprecated } from './assert.js';

describe('#assertDeprecated()', () => {
    const consoleMock = vi.spyOn(console, 'warn').mockImplementation(() => {});

    afterEach(() => {
        vi.clearAllMocks();
    });

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
