import { describe, expect, it } from 'vitest';

import { castArray, escapeRegExp } from './utils.js';

describe('#escapeRegExp()', () => {
    it('escapes all RegExp chars', () => {
        // eslint-disable-next-line no-useless-escape
        const result = escapeRegExp('\*?{}.(?<test>.)|[]');

        expect(result).toBe('\\*\\?\\{\\}\\.\\(\\?<test>\\.\\)\\|\\[\\]');
    });
});

describe('#castArray()', () => {
    it('returns empty array for nullish input values', () => {
        const result1 = castArray();
        const result2 = castArray(undefined);
        const result3 = castArray(null);

        expect(result1).toStrictEqual([]);
        expect(result2).toStrictEqual([]);
        expect(result3).toStrictEqual([]);
    });

    it('directly returns value if it is already of type array', () => {
        const value = ['example'];
        const result = castArray(value);

        expect(result).toBe(value);
    });

    describe('casts primitives to an array', () => {
        it.each([1, 'example', {}])('%s', (value) => {
            const result = castArray(value);

            expect(result).toStrictEqual([value]);
        });
    });
});
