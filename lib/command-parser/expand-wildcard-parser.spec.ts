import { describe, expect, it } from 'vitest';

import { ExpandWildcard } from './expand-wildcard.js';

const createParser = (scripts: Record<string, string> = { 'build:app': '', 'build:lib': '' }) =>
    new ExpandWildcard(
        () => ({}),
        () => ({ scripts }),
    );

describe('parser-based wildcard expansion', () => {
    it.each([
        ['npm run build:*; echo done', 'npm run build:app; echo done'],
        ['npm run build:* | cat', 'npm run build:app | cat'],
        [' \tnpm run build:*', ' \tnpm run build:app'],
        ["npm run build:* -- don't", "npm run build:app -- don't"],
        ['npm run build:* ; Write-Output `"done`"', 'npm run build:app ; Write-Output `"done`"'],
    ])('keeps the source around %s', (command, expected) => {
        expect(createParser({ 'build:app': '' }).parse({ command, name: '' })).toEqual([
            { name: 'app', command: expected },
        ]);
    });

    it('expands only the first eligible runner', () => {
        expect(
            createParser().parse({ command: 'npm run build:* && npm run test:*', name: '' }),
        ).toEqual([
            { name: 'app', command: 'npm run build:app && npm run test:*' },
            { name: 'lib', command: 'npm run build:lib && npm run test:*' },
        ]);
    });

    it('quotes special characters in matched script names', () => {
        const parser = createParser({
            'build:with space': '',
            "build:it's": '',
            'build:$HOME': '',
            "build:it's!": '',
        });
        expect(parser.parse({ command: 'npm run "build:*"', name: '' })).toEqual([
            { name: 'with space', command: "npm run 'build:with space'" },
            { name: "it's", command: "npm run 'build:it'\\''s'" },
            { name: '$HOME', command: "npm run 'build:$HOME'" },
            { name: "it's!", command: "npm run 'build:it'\\''s!'" },
        ]);
    });

    it('rejects NUL in a matched script name', () => {
        expect(() =>
            createParser({ 'build:\0': '' }).parse({ command: 'npm run build:*', name: '' }),
        ).toThrow(new TypeError('Arguments cannot contain NUL'));
    });

    it('leaves an interior @ in a matched script name unquoted', () => {
        expect(
            createParser({ 'build:app@dev': '' }).parse({ command: 'npm run build:*', name: '' }),
        ).toEqual([{ name: 'app@dev', command: 'npm run build:app@dev' }]);
    });

    it('keeps a leading @ in a matched script name quoted', () => {
        expect(createParser({ '@lint': '' }).parse({ command: 'npm run *', name: '' })).toEqual([
            { name: '@lint', command: "npm run '@lint'" },
        ]);
    });

    it.each([
        'test:*-unit(!slow|integration)',
        'test:*(!slow|integration)-unit',
        '"test:*-unit(!slow|integration)"',
    ])('preserves a chain around omission pattern %s', (pattern) => {
        const parser = createParser({
            'test:fast-unit': '',
            'test:slow-unit': '',
            'test:integration-unit': '',
        });
        expect(
            parser.parse({ command: `cd app && npm run ${pattern} && echo done`, name: '' }),
        ).toEqual([{ name: 'fast', command: 'cd app && npm run test:fast-unit && echo done' }]);
    });

    it.each(["'test:*-unit(!slow\\.case)'", 'test:*-unit(!slow\\.case)'])(
        'preserves regex escapes in %s',
        (pattern) => {
            const parser = createParser({ 'test:slow.case-unit': '', 'test:slowXcase-unit': '' });
            expect(parser.parse({ command: `npm run ${pattern} && echo done`, name: '' })).toEqual([
                { name: 'slowXcase', command: 'npm run test:slowXcase-unit && echo done' },
            ]);
        },
    );

    it.each([
        'build() { npm run build:*; }',
        'echo $(npm run build:*)',
        'echo `npm run build:*`',
        '(npm run build:*)',
    ])('does not traverse a nested invocation: %s', (command) => {
        const input = { command, name: '' };
        expect(createParser().parse(input)).toBe(input);
    });
});
