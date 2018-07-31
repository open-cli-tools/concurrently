const Rx = require('rxjs');

module.exports = class Command {
    constructor({ index, info, killProcess, spawn, spawnOpts }) {
        this.index = index;
        this.info = info;
        this.killProcess = killProcess;
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
        this.pid = child.pid;

        Rx.fromEvent(child, 'error').subscribe(event => {
            this.process = undefined;
            this.error.next(event);
        });
        Rx.fromEvent(child, 'close').subscribe(([exitCode, signal]) => {
            this.process = undefined;
            this.close.next(exitCode === null ? signal : exitCode);
        });
        child.stdout && pipeTo(Rx.fromEvent(child.stdout, 'data'), this.stdout);
        child.stderr && pipeTo(Rx.fromEvent(child.stderr, 'data'), this.stderr);
    }

    kill(code) {
        this.killProcess(this.pid, code);
    }
}

function pipeTo(stream, subject) {
    stream.subscribe(event => subject.next(event));
}
