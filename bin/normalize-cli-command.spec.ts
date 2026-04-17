import { expect, it } from 'vitest';

import { normalizeCliCommand } from './normalize-cli-command.js';

it('CLIラッパーとして付いた外側のクォートを外す', () => {
    expect(normalizeCliCommand('"echo foo"')).toBe('echo foo');
});

it('CLIラッパーとして付いた外側のシングルクォートを外す', () => {
    expect(normalizeCliCommand("'echo foo'")).toBe('echo foo');
});

it('単一トークン全体を包むクォートは外す', () => {
    expect(normalizeCliCommand('"echo"')).toBe('echo');
    expect(normalizeCliCommand("'echo'")).toBe('echo');
});

it('正しいシェルコマンド内のクォートは保持する', () => {
    expect(normalizeCliCommand('"/usr/local/bin/mytool" --flag "some value"')).toBe(
        '"/usr/local/bin/mytool" --flag "some value"',
    );
});

it('複数のクォートセットを含む正しいシェルコマンドは保持する', () => {
    expect(
        normalizeCliCommand('"/usr/local/bin/mytool" --flag "some value" --other "last arg"'),
    ).toBe('"/usr/local/bin/mytool" --flag "some value" --other "last arg"');
});

it('正しいシェルコマンド内のシングルクォートは保持する', () => {
    expect(normalizeCliCommand("'printf' '%s %s' foo bar")).toBe("'printf' '%s %s' foo bar");
});

it('クォートされていない入力はそのまま返す', () => {
    expect(normalizeCliCommand('echo foo')).toBe('echo foo');
});

it('空文字はそのまま返す', () => {
    expect(normalizeCliCommand('')).toBe('');
});

it('判定が曖昧な入力はそのままにする', () => {
    expect(normalizeCliCommand('"echo foo')).toBe('"echo foo');
});
