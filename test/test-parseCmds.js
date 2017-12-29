"use strict";

var assert = require('assert');

var parseCmds = require('../src/parseCmds');

describe('parseCmds', () => {

    it('returns a list of command objects', () => {
        var cmds = parseCmds([ 'echo test' ]);

        assert.deepStrictEqual(cmds, [
            {
                cmd: 'echo test',
                name: '',
                color: undefined
            }
        ]);
    });

    it('strips quotes', () => {
        var cmds = parseCmds([ '"echo test"' ]);

        assert.deepStrictEqual(cmds, [
            {
                cmd: 'echo test',
                name: '',
                color: undefined
            }
        ]);
    });

    it('assigns names', () => {
        var cmds = parseCmds([ 'echo test', 'echo test2' ], {
            names: 'echo-test,echo-test2'
        });

        assert.deepStrictEqual(cmds, [
            {
                cmd: 'echo test',
                name: 'echo-test',
                color: undefined
            },
            {
                cmd: 'echo test2',
                name: 'echo-test2',
                color: undefined
            }
        ]);
    });

    it('assigns names with custom separator', () => {
        var cmds = parseCmds([ 'echo test', 'echo test2' ], {
            names: 'echo-test|echo-test2',
            nameSeparator: '|'
        });

        assert.deepStrictEqual(cmds, [
            {
                cmd: 'echo test',
                name: 'echo-test',
                color: undefined
            },
            {
                cmd: 'echo test2',
                name: 'echo-test2',
                color: undefined
            }
        ]);
    });

    it('assigns colours', () => {
        var cmds = parseCmds([ 'echo test', 'echo test2' ], {
            prefixColors: 'blue'
        });

        assert.deepStrictEqual(cmds, [
            {
                cmd: 'echo test',
                name: '',
                color: 'blue'
            },
            {
                cmd: 'echo test2',
                name: '',
                color: undefined
            }
        ]);
    });

    it('expands npm: shortcut', () => {
        var cmds = parseCmds([ 'npm:watch:js' ]);

        assert.deepStrictEqual(cmds, [
            {
                cmd: 'npm run watch:js',
                name: 'watch:js',
                color: undefined
            }
        ]);
    });

    it('expands npm: shortcut with assigned name', () => {
        var cmds = parseCmds([ 'npm:watch:js' ], {
            names: 'js'
        });

        assert.deepStrictEqual(cmds, [
            {
                cmd: 'npm run watch:js',
                name: 'js',
                color: undefined
            }
        ]);
    });
});
