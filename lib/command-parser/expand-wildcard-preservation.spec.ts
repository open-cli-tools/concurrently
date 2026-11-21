import { describe, expect, it } from 'vitest';

import { ExpandWildcard } from './expand-wildcard.js';

const createParser = (scripts: Record<string, string> = { 'build:app': '' }) =>
    new ExpandWildcard(
        () => ({}),
        () => ({ scripts }),
    );

describe('preserving commands around wildcard scripts', () => {
    it.each([
        ['npm run build:* && echo done', 'npm run build:app && echo done'],
        ['cd app && npm run build:*', 'cd app && npm run build:app'],
        ['npm run build:* -- --grep "a & b"', 'npm run build:app -- --grep "a & b"'],
        ['cross-env NODE_ENV=test npm run build:*', 'cross-env NODE_ENV=test npm run build:app'],
        ['npx pnpm run build:*', 'npx pnpm run build:app'],
        ['npm run clean && npm run build:*', 'npm run clean && npm run build:app'],
        ['npm run "build:*"', 'npm run build:app'],
        ['npm run build:* && echo "unfinished', 'npm run build:app && echo "unfinished'],
        ['npm run build:* && && echo done', 'npm run build:app && && echo done'],
    ])('replaces just the script in %s', (command, expected) => {
        expect(createParser().parse({ command, name: '' })).toEqual([
            { command: expected, name: 'app' },
        ]);
    });

    it('does not expand a runner inside one quoted argument', () => {
        const input = { command: 'echo "npm run build:*"', name: '' };
        expect(createParser().parse(input)).toBe(input);
    });

    it('preserves chained commands with the existing omission syntax', () => {
        const parser = createParser({ 'lint:js': '', 'lint:fix:js': '' });
        expect(parser.parse({ command: 'npm run lint:*(!fix) && echo done', name: '' })).toEqual([
            { command: 'npm run lint:js && echo done', name: 'js' },
        ]);
    });

    it('does not repair an unterminated script word', () => {
        const input = { command: 'npm run "build:*', name: '' };
        expect(createParser().parse(input)).toBe(input);
    });
});
