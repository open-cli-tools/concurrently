import { describe, expect, it } from 'vitest';

import { CommandInfo } from '../command.js';
import { ExpandWildcard } from './expand-wildcard.js';

const createCommandInfo = (command: string): CommandInfo => ({ command, name: '' });
const createParser = (
    shell: string | undefined,
    scripts: Record<string, string> = { 'build:app': '', 'build:lib': '' },
) =>
    new ExpandWildcard(
        () => ({}),
        () => ({ scripts }),
        shell,
    );

describe('legacy expansion for other shells', () => {
    it.each(['cmd.exe', 'powershell.exe', 'pwsh', 'zsh', 'fish', 'custom-shell', undefined])(
        'keeps legacy names, whitespace and tail handling with %s',
        (shell) => {
            const parser = createParser(shell, { 'build:app+docs': '', 'build:café': '' });

            expect(parser.parse(createCommandInfo(' npm run build:* && echo done'))).toEqual([
                { name: 'app+docs', command: 'npm run build:app+docs ' },
                { name: 'café', command: 'npm run build:café ' },
            ]);
        },
    );

    it('keeps legacy prefix removal', () => {
        expect(createParser('zsh').parse(createCommandInfo('cd app && npm run build:*'))).toEqual([
            { name: 'app', command: 'npm run build:app' },
            { name: 'lib', command: 'npm run build:lib' },
        ]);
    });

    it('accepts a literal apostrophe in a cmd argument', () => {
        expect(
            createParser('cmd.exe').parse(createCommandInfo("npm run build:* -- don't")),
        ).toEqual([
            { name: 'app', command: "npm run build:app -- don't" },
            { name: 'lib', command: "npm run build:lib -- don't" },
        ]);
    });

    it('keeps a PowerShell tail containing escaped quotes', () => {
        expect(
            createParser('pwsh').parse(
                createCommandInfo('npm run build:* ; Write-Output `"done`"'),
            ),
        ).toEqual([
            { name: 'app', command: 'npm run build:app ; Write-Output `"done`"' },
            { name: 'lib', command: 'npm run build:lib ; Write-Output `"done`"' },
        ]);
    });

    it('keeps omission filtering after a fixed suffix', () => {
        const parser = createParser('fish', { 'test:fast-unit': '', 'test:slow-unit': '' });

        expect(parser.parse(createCommandInfo('npm run test:*-unit(!slow)'))).toEqual([
            { name: 'fast', command: 'npm run test:fast-unit' },
        ]);
    });
});

describe('Bash syntax expansion', () => {
    it.each([
        ['npm run build:*', "npm run 'build:app'"],
        ['pnpm run build:*', "pnpm run 'build:app'"],
        ['yarn run build:*', "yarn run 'build:app'"],
        ['bun run build:*', "bun run 'build:app'"],
        ['node --run build:*', "node --run 'build:app'"],
        ['deno task build:*', "deno task 'build:app'"],
    ])('expands each supported runner: %s', (command, expected) => {
        expect(
            createParser('/bin/sh', { 'build:app': '' }).parse(createCommandInfo(command)),
        ).toEqual([{ name: 'app', command: expected }]);
    });

    it('retains shortcut names and custom prefixes', () => {
        const parser = createParser('/bin/sh', { 'build:app': '' });

        expect(parser.parse({ command: 'npm run build:*', name: 'build:*' })).toEqual([
            { name: 'app', command: "npm run 'build:app'" },
        ]);
        expect(parser.parse({ command: 'npm run build:*', name: 'watch:' })).toEqual([
            { name: 'watch:app', command: "npm run 'build:app'" },
        ]);
    });

    it.each(['/bin/bash', '/bin/sh', '/bin/dash', '/bin/ash', 'C:\\Git\\bin\\bash.exe'])(
        'preserves command chains with %s',
        (shell) => {
            expect(
                createParser(shell).parse(
                    createCommandInfo('cd app && npm run build:* && echo done'),
                ),
            ).toEqual([
                { name: 'app', command: "cd app && npm run 'build:app' && echo done" },
                { name: 'lib', command: "cd app && npm run 'build:lib' && echo done" },
            ]);
        },
    );

    it.each([
        [
            'npm run build:*; echo done',
            "npm run 'build:app'; echo done",
            "npm run 'build:lib'; echo done",
        ],
        ['npm run build:* | cat', "npm run 'build:app' | cat", "npm run 'build:lib' | cat"],
        [
            'npm run build:* -- --grep "a & b"',
            'npm run \'build:app\' -- --grep "a & b"',
            'npm run \'build:lib\' -- --grep "a & b"',
        ],
        [' \tnpm run build:*', " \tnpm run 'build:app'", " \tnpm run 'build:lib'"],
    ])('preserves surrounding source: %s', (command, app, lib) => {
        expect(createParser('/bin/sh').parse(createCommandInfo(command))).toEqual([
            { name: 'app', command: app },
            { name: 'lib', command: lib },
        ]);
    });

    it('leaves a runner-looking quoted argument unchanged', () => {
        const commandInfo = createCommandInfo('echo "npm run build:*"');

        expect(createParser('/bin/sh').parse(commandInfo)).toBe(commandInfo);
    });

    it.each([
        ['cross-env NODE_ENV=test npm run build:*', 'npm run build:app'],
        ['npx pnpm run build:*', 'pnpm run build:app'],
        ['node wrapper.cjs node --run build:*', 'node --run build:app'],
        ['echo npm run build:*', 'npm run build:app'],
    ])('keeps legacy expansion for runner words used as arguments: %s', (command, expected) => {
        expect(
            createParser('/bin/sh', { 'build:app': '' }).parse(createCommandInfo(command)),
        ).toEqual([{ name: 'app', command: expected }]);
    });

    it('finds a later runner after one without a wildcard', () => {
        expect(
            createParser('/bin/sh').parse(createCommandInfo('npm run clean && npm run build:*')),
        ).toEqual([
            { name: 'app', command: "npm run clean && npm run 'build:app'" },
            { name: 'lib', command: "npm run clean && npm run 'build:lib'" },
        ]);
    });

    it('expands only the first eligible runner', () => {
        expect(
            createParser('/bin/sh').parse(createCommandInfo('npm run build:* && npm run test:*')),
        ).toEqual([
            { name: 'app', command: "npm run 'build:app' && npm run test:*" },
            { name: 'lib', command: "npm run 'build:lib' && npm run test:*" },
        ]);
    });

    it('quotes spaces, apostrophes, dollar signs and exclamation marks in matched script names', () => {
        const parser = createParser('/bin/sh', {
            'build:with space': '',
            "build:it's": '',
            'build:$HOME': '',
            "build:it's!": '',
        });

        expect(parser.parse(createCommandInfo('npm run "build:*"'))).toEqual([
            { name: 'with space', command: "npm run 'build:with space'" },
            { name: "it's", command: "npm run 'build:it'\\''s'" },
            { name: '$HOME', command: "npm run 'build:$HOME'" },
            { name: "it's!", command: "npm run 'build:it'\\''s!'" },
        ]);
    });

    it('rejects NUL in a matched script name', () => {
        expect(() =>
            createParser('/bin/sh', { 'build:\0': '' }).parse(createCommandInfo('npm run build:*')),
        ).toThrow(new TypeError('Arguments cannot contain NUL'));
    });

    it('filters omissions after the wildcard while preserving a chain', () => {
        const parser = createParser('/bin/sh', {
            'test:fast-unit': '',
            'test:slow-unit': '',
        });

        expect(
            parser.parse(createCommandInfo('cd app && npm run test:*(!slow)-unit && echo done')),
        ).toEqual([{ name: 'fast', command: "cd app && npm run 'test:fast-unit' && echo done" }]);
    });

    it('falls back to legacy omission filtering after a fixed suffix', () => {
        const parser = createParser('/bin/sh', {
            'test:fast-unit': '',
            'test:slow-unit': '',
            'test:integration-unit': '',
        });

        expect(
            parser.parse(
                createCommandInfo('npm run test:*-unit(!slow|integration) -- --runInBand'),
            ),
        ).toEqual([{ name: 'fast', command: 'npm run test:fast-unit -- --runInBand' }]);
    });

    it('keeps legacy chain handling when a suffix omission requires fallback', () => {
        const parser = createParser('/bin/sh', {
            'test:fast-unit': '',
            'test:slow-unit': '',
        });

        expect(
            parser.parse(createCommandInfo('cd app && npm run test:*-unit(!slow) && echo done')),
        ).toEqual([{ name: 'fast', command: 'npm run test:fast-unit ' }]);
    });

    it.each([
        'cd app && npm run "test:*-unit(!slow|integration)" && echo done',
        "cd app && npm run 'test:*-unit(!slow|integration)' && echo done",
    ])('preserves the command around a quoted suffix omission: %s', (command) => {
        const parser = createParser('/bin/sh', {
            'test:fast-unit': '',
            'test:slow-unit': '',
            'test:integration-unit': '',
        });

        expect(parser.parse(createCommandInfo(command))).toEqual([
            { name: 'fast', command: "cd app && npm run 'test:fast-unit' && echo done" },
        ]);
    });

    it('preserves regex escapes in a quoted omission', () => {
        const parser = createParser('/bin/sh', {
            'test:slow.case-unit': '',
            'test:slowXcase-unit': '',
        });

        expect(
            parser.parse(createCommandInfo("npm run 'test:*-unit(!slow\\.case)' && echo done")),
        ).toEqual([{ name: 'slowXcase', command: "npm run 'test:slowXcase-unit' && echo done" }]);
    });

    it.each([
        'build() { npm run build:*; }',
        'echo $(npm run build:*)',
        'echo `npm run build:*`',
        '(npm run build:*)',
    ])('does not traverse a nested invocation: %s', (command) => {
        const commandInfo = createCommandInfo(command);

        expect(createParser('/bin/sh').parse(commandInfo)).toBe(commandInfo);
    });
});
