const Rx = require('rx');

module.exports = class Command {
    constructor({ index, info, spawn, spawnOpts }) {
        this.index = index;
        this.info = info;
        this.spawn = spawn;
        this.spawnOpts = spawnOpts;

        this.error = new Rx.Subject();
        this.close = new Rx.Subject();
        this.stdout = new Rx.Subject();
        this.stderr = new Rx.Subject();
    }

    start() {
        const child = this.spawn(this.info.command, this.spawnOpts);
        this.process = child;

        pipeTo(Rx.Node.fromEvent(child, 'error'), this.error);
        pipeTo(Rx.Node.fromEvent(child, 'close'), this.close);
        child.stdout && pipeTo(Rx.Node.fromReadableStream(child.stdout), this.stdout);
        child.stderr && pipeTo(Rx.Node.fromReadableStream(child.stderr), this.stderr);
    }

    kill() {

    }
}

function pipeTo(stream, subject) {
    stream.subscribe(event => subject.onNext(event));
}
