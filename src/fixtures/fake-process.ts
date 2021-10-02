import { ChildProcess } from 'child_process';
import { EventEmitter } from 'stream';

export class FakeProcess extends EventEmitter implements ChildProcess {
    pid = 1;
    exitCode = null;
    signalCode = null;
    killed = false;
    connected = true;
    stdio = [null, null, null, null, null] as [null, null, null, null, null];
    stdin = null;
    stdout = null;
    stderr = null;
    spawnfile = '';
    spawnargs = [];

    disconnect() {}
    ref() {}
    unref() {}

    send() {
        return true;
    }

    kill() {
        return true;
    }
}
