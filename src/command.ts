import { ChildProcess as BaseChildProcess, SpawnOptions } from 'child_process';
import * as Rx from 'rxjs';
import { EventEmitter, Writable } from 'stream';
import { number } from 'yargs';

export interface CommandInfo {
    name: string,
    command: string,
    env?: Record<string, any>,
    prefixColor?: string,
}

export interface CloseEvent {
    command: CommandInfo;
    index: number,
    killed: boolean;
    exitCode: string | number;
    timings: {
        startDate: Date,
        endDate: Date,
        durationSeconds: number,
    }
}

export interface TimerEvent {
    startDate: Date;
    endDate?: Date;
}

export type ChildProcess = EventEmitter & Pick<BaseChildProcess, 'pid' | 'stdin' | 'stdout' | 'stderr'>;
export type KillProcess = (pid: number, signal?: string | number) => void;
export type SpawnCommand = (command: string, options: SpawnOptions) => ChildProcess;

export class Command implements CommandInfo {
    private readonly killProcess: KillProcess;
    private readonly spawn: SpawnCommand;
    private readonly spawnOpts: SpawnOptions;
    readonly index: number;

    /** @inheritdoc */
    readonly name: string;

    /** @inheritdoc */
    readonly command: string;

    /** @inheritdoc */
    readonly prefixColor: string;

    /** @inheritdoc */
    readonly env: Record<string, any>;

    readonly close = new Rx.Subject<CloseEvent>();
    readonly error = new Rx.Subject<unknown>();
    readonly stdout = new Rx.Subject<Buffer>();
    readonly stderr = new Rx.Subject<Buffer>();
    readonly timer = new Rx.Subject<TimerEvent>();

    process?: ChildProcess;
    stdin?: Writable;
    pid?: number;
    killed = false;
    exited = false;

    get killable() {
        return !!this.process;
    }

    constructor(
        { index, name, command, prefixColor, env }: CommandInfo & { index: number },
        spawnOpts: SpawnOptions,
        spawn: SpawnCommand,
        killProcess: KillProcess,
    ) {
        this.index = index;
        this.name = name;
        this.command = command;
        this.prefixColor = prefixColor;
        this.env = env;
        this.killProcess = killProcess;
        this.spawn = spawn;
        this.spawnOpts = spawnOpts;
    }

    start() {
        const child = this.spawn(this.command, this.spawnOpts);
        this.process = child;
        this.pid = child.pid;
        const startDate = new Date(Date.now());
        const highResStartTime = process.hrtime();
        this.timer.next({ startDate });

        Rx.fromEvent<unknown>(child, 'error').subscribe(event => {
            this.process = undefined;
            const endDate = new Date(Date.now());
            this.timer.next({ startDate, endDate });
            this.error.next(event);
        });
        Rx.fromEvent<[number | null, NodeJS.Signals | null]>(child, 'close').subscribe(([exitCode, signal]) => {
            this.process = undefined;
            this.exited = true;

            const endDate = new Date(Date.now());
            this.timer.next({ startDate, endDate });
            const [durationSeconds, durationNanoSeconds] = process.hrtime(highResStartTime);
            this.close.next({
                command: this,
                index: this.index,
                exitCode: exitCode === null ? signal : exitCode,
                killed: this.killed,
                timings: {
                    startDate,
                    endDate,
                    durationSeconds: durationSeconds + (durationNanoSeconds / 1e9),
                }
            });
        });
        child.stdout && pipeTo(Rx.fromEvent<Buffer>(child.stdout, 'data'), this.stdout);
        child.stderr && pipeTo(Rx.fromEvent<Buffer>(child.stderr, 'data'), this.stderr);
        this.stdin = child.stdin;
    }

    kill(code?: string | number) {
        if (this.killable) {
            this.killed = true;
            this.killProcess(this.pid, code);
        }
    }
};

function pipeTo<T>(stream: Rx.Observable<T>, subject: Rx.Subject<T>) {
    stream.subscribe(event => subject.next(event));
}
