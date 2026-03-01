/*
ORIGINAL https://www.npmjs.com/package/tiny-jsonc
BY Fabio Spampinato
MIT license

Copied due to the dependency not being compatible with CommonJS
*/

const stringOrCommentRe = /("(?:\\?[\s\S])*?")|(\/\/.*)|(\/\*[\s\S]*?\*\/)/g;
const stringOrTrailingCommaRe = /("(?:\\?[\s\S])*?")|(,\s*)(?=\]|\})/g;

const JSONC = {
    parse: (text: string) => {
        text = String(text); // To be extra safe

        try {
            // Fast path for valid JSON
            return JSON.parse(text) as unknown;
        } catch {
            // Slow path for JSONC and invalid inputs
            return JSON.parse(
                text.replace(stringOrCommentRe, '$1').replace(stringOrTrailingCommaRe, '$1'),
            ) as unknown;
        }
    },
    stringify: JSON.stringify,
};

export default JSONC;
