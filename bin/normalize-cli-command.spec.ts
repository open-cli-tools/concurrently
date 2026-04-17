import { expect, it } from 'vitest';

import { normalizeCliCommand } from './normalize-cli-command.js';

it('strips outer CLI wrapper double quotes', () => {
    expect(normalizeCliCommand('"echo foo"')).toBe('echo foo');
});

it('strips outer CLI wrapper single quotes', () => {
    expect(normalizeCliCommand("'echo foo'")).toBe('echo foo');
});

it('strips quotes around a single wrapped token', () => {
    expect(normalizeCliCommand('"echo"')).toBe('echo');
    expect(normalizeCliCommand("'echo'")).toBe('echo');
});

it('preserves quotes in well-formed shell commands', () => {
    expect(normalizeCliCommand('"/usr/local/bin/mytool" --flag "some value"')).toBe(
        '"/usr/local/bin/mytool" --flag "some value"',
    );
});

it('preserves well-formed shell commands with multiple quote sets', () => {
    expect(
        normalizeCliCommand('"/usr/local/bin/mytool" --flag "some value" --other "last arg"'),
    ).toBe('"/usr/local/bin/mytool" --flag "some value" --other "last arg"');
});

it('preserves single quotes in well-formed shell commands', () => {
    expect(normalizeCliCommand("'printf' '%s %s' foo bar")).toBe("'printf' '%s %s' foo bar");
});

it('returns unquoted input unchanged', () => {
    expect(normalizeCliCommand('echo foo')).toBe('echo foo');
});

it('returns an empty string unchanged', () => {
    expect(normalizeCliCommand('')).toBe('');
});

it('leaves ambiguous input unchanged', () => {
    expect(normalizeCliCommand('"echo foo')).toBe('"echo foo');
});

it('leaves input with an unclosed single quote unchanged', () => {
    expect(normalizeCliCommand("echo foo'")).toBe("echo foo'");
});

it('leaves input with mismatched quote types unchanged', () => {
    expect(normalizeCliCommand('"echo foo\'')).toBe('"echo foo\'');
});
