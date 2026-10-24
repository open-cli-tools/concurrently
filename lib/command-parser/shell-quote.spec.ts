import { describe, expect, it } from 'vitest';

import { quote } from './shell-quote.js';

const isWin32 = process.platform === 'win32';

describe('on POSIX (Linux / macOS)', () => {
    if (isWin32) {
        it.skip('Skipping POSIX tests on Windows', () => {});
        return;
    }
    it('should handle arguments with spaces', () => {
        expect(quote(['foo bar'])).toBe("'foo bar'");
    });
});

describe('on Windows (win32)', () => {
    if (!isWin32) {
        it.skip('Skipping Windows tests on non-Windows platforms', () => {});
        return;
    }
    it('should wrap arguments containing spaces in double quotes', () => {
        const escaped = quote(['foo bar']);
        expect(escaped).toBe('"foo bar"');
    });

    it('should escape internal double quotes', () => {
        const escaped = quote(['--json={"key": "value"}']);
        expect(escaped).toBe('"--json={\\"key\\": \\"value\\"}"');
    });

    it('should escape internal trailing backslashes when arguments containing spaces', () => {
        const escaped = quote(['C:\\path to file\\']);
        expect(escaped).toBe('"C:\\path to file\\\\"');
    });

    it('should not escape safe special characters', () => {
        const escaped = quote(['--tags=@foo']);
        expect(escaped).toBe('--tags=@foo');
    });
});
