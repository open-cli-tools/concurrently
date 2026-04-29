import { describe, expect, it } from 'vitest';

import { castArray, escapeRegExp, splitOutsideParens } from './utils.js';

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

describe('#splitOutsideParens()', () => {
    it('splits on the given delimiter', () => {
        expect(splitOutsideParens('red,blue', ',')).toEqual(['red', 'blue']);
    });

    it('preserves delimiters inside parentheses', () => {
        expect(splitOutsideParens('red,rgb(255,0,0),blue', ',')).toEqual([
            'red',
            'rgb(255,0,0)',
            'blue',
        ]);
    });

    it('splits chalk-style dotted color paths, preserving function calls', () => {
        expect(splitOutsideParens('black.bgHex(#533AFD).dim', '.')).toEqual([
            'black',
            'bgHex(#533AFD)',
            'dim',
        ]);
    });

    it('trims whitespace around each segment', () => {
        expect(splitOutsideParens('  red ,  blue  ', ',')).toEqual(['red', 'blue']);
    });

    it('drops empty segments', () => {
        expect(splitOutsideParens(',,red,,', ',')).toEqual(['red']);
    });

    it('returns an empty array for an empty input', () => {
        expect(splitOutsideParens('', ',')).toEqual([]);
    });
});
