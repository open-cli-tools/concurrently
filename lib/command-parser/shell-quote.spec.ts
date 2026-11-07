import { describe, expect, it } from 'vitest';

import { ShellKind } from '../spawn.js';
import { createShellQuote } from './shell-quote.js';

describe('on POSIX', () => {
    const quote = createShellQuote('posix');
    it('should handle arguments with spaces', () => {
        expect(quote(['foo bar'])).toBe("'foo bar'");
    });
});

describe.each(['cmd', 'powershell'] as ShellKind[])('on %s', (shellKind: ShellKind) => {
    const quote = createShellQuote(shellKind);
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
