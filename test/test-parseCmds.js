"use strict";
const assert = require('assert');

const parseCmds = require('../src/parseCmds');


describe('parseCmds', () => {

    it('returns a list of command objects', () => {
        let cmds = parseCmds([ 'echo test' ]);

        assert.deepStrictEqual(cmds, [
            {
                cmd: 'echo test',
                name: '',
                color: undefined
            }
        ]);
    });

    it('strips quotes', () => {
        let cmds = parseCmds([ '"echo test"' ]);

        assert.deepStrictEqual(cmds, [
            {
                cmd: 'echo test',
                name: '',
                color: undefined
            }
        ]);
    });

    it('assigns names', () => {
        let cmds = parseCmds([ 'echo test', 'echo test2' ], {
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
        let cmds = parseCmds([ 'echo test', 'echo test2' ], {
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
        let cmds = parseCmds([ 'echo test', 'echo test2' ], {
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
        let cmds = parseCmds([ 'npm:watch:js' ]);

        assert.deepStrictEqual(cmds, [
            {
                cmd: 'npm run watch:js',
                name: 'watch:js',
                color: undefined
            }
        ]);
    });

    it('expands npm: shortcut with assigned name', () => {
        let cmds = parseCmds([ 'npm:watch:js' ], {
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
