const EventEmitter = require('events');
const Rx = require('rx');

module.exports = class Command extends EventEmitter {
    constructor({ index, info, spawn, spawnOpts }) {
        super();
        this.index = index;
        this.info = info;
        this.spawn = spawn;
        this.spawnOpts = spawnOpts;
    }

    start() {
        const child = this.spawn(this.info.command, this.spawnOpts);
        this.process = child;

        this.error = Rx.Node.fromEvent(child, 'error');
        this.close = Rx.Node.fromEvent(child, 'close');
        this.stdout = child.stdout && Rx.Node.fromReadableStream(child.stdout);
        this.stderr = child.stderr && Rx.Node.fromReadableStream(child.stderr);

        this.emit('start');
    }

    kill() {

    }
}
