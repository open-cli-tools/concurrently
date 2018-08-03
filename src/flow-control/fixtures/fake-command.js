const { Subject } = require('rxjs');

module.exports = () => ({
    index: 0,
    name: 'foo',
    command: 'echo foo',
    close: new Subject(),
    error: new Subject(),
    stderr: new Subject(),
    stdout: new Subject(),
    start: jest.fn(),
    kill: jest.fn()
});
