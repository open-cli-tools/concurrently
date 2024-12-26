/*
ORIGINAL https://www.npmjs.com/package/tiny-jsonc
BY Fabio Spampinato
MIT license

Copied due to the dependency not being compatible with CommonJS
*/

import JSONC from './jsonc';

const Fixtures = {
    errors: {
        comment: '// asd',
        empty: '',
        prefix: 'invalid 123',
        suffix: '123 invalid',
        multiLineString: `
        {
            "foo": "/*
            */"
        }
        `,
    },
    parse: {
        input: `
        // Example // Yes
        /* EXAMPLE */ /* YES */
        {
            "one": {},
            "two" :{},
            "three": {
                "one": null,
                "two" :true,
                "three": false,
                "four": "asd\\n\\u0022\\"",  
                "five": -123.123e10,
                "six": [ 123, true, [],],
            },
        }
        // Example // Yes
        /* EXAMPLE */ /* YES */
        `,
        output: {
            one: {},
            two: {},
            three: {
                one: null,
                two: true,
                three: false,
                four: 'asd\n\u0022"',
                five: -123.123e10,
                six: [123, true, []],
            },
        },
    },
};

describe('Tiny JSONC', () => {
    it('supports strings with comments and trailing commas', () => {
        const { input, output } = Fixtures.parse;

        expect(JSONC.parse(input)).toEqual(output);
    });

    it('throws on invalid input', () => {
        const { prefix, suffix } = Fixtures.errors;

        expect(() => JSONC.parse(prefix)).toThrow(SyntaxError);
        expect(() => JSONC.parse(suffix)).toThrow(SyntaxError);
    });

    it('throws on insufficient input', () => {
        const { comment, empty } = Fixtures.errors;

        expect(() => JSONC.parse(comment)).toThrow(SyntaxError);
        expect(() => JSONC.parse(empty)).toThrow(SyntaxError);
    });

    it('throws on multi-line strings', () => {
        const { multiLineString } = Fixtures.errors;

        expect(() => JSONC.parse(multiLineString)).toThrow(SyntaxError);
    });
});
