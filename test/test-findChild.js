"use strict";

const assert = require('assert');

const findChild = require('../src/findChild');

describe('findChild', () => {

    let aChild = { pid: '111' };
    let bChild = { pid: '222' };

    let children = [ aChild, bChild ];

    let childrenInfo = {
        111: {
            index: 0,
            name: 'a child'
        },
        222: {
            index: 1,
            name: 'b child'
        }
    };

    it('finds child by index', () => {
        let child = findChild('1', children, childrenInfo);
        assert.strictEqual(child, bChild);
    });

    it('finds child by name', () => {
        let child = findChild('a child', children, childrenInfo);
        assert.strictEqual(child, aChild);
    });

    it('returns undefined when no matching child found', () => {
        let child = findChild('no child', children, childrenInfo);
        assert.strictEqual(child, undefined);
    });
});
