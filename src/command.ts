import { ChildProcess as BaseChildProcess, SpawnOptions } from 'child_process';
import * as Rx from 'rxjs';
import { EventEmitter, Writable } from 'stream';

/**
 * Identifier for a command; if string, it's the command's name, if number, it's the index.
 */
export type CommandIdentifier = string | number;

export interface CommandInfo {
    /**
     * Command's name.
     */
    name: string;

    /**
     * Which command line the command has.
     */
    command: string;

    /**
     * Which environment variables should the spawned process have.
     */
    env?: Record<string, unknown>;

    /**
     * The current working directory of the process when spawned.
     */
    cwd?: string;

    /**
     * Color to use on prefix of command.
     */
    prefixColor?: string;
}

export interface CloseEvent {
    command: CommandInfo;

    /**
     * The command's index among all commands ran.
     */
    index: number;

    /**
     * Whether the command exited because it was killed.
     */
    killed: boolean;

    /**
     * The exit code or signal for the command.
     */
    exitCode: string | number;
    timings: {
        startDate: Date;
        endDate: Date;
        durationSeconds: number;
    };
}

export interface TimerEvent {
    startDate: Date;
    endDate?: Date;
}

/**
 * Subtype of NodeJS's child_process including only what's actually needed for a command to work.
 */
export type ChildProcess = EventEmitter &
    Pick<BaseChildProcess, 'pid' | 'stdin' | 'stdout' | 'stderr'>;

/**
 * Interface for a function that must kill the process with `pid`, optionally sending `signal` to it.
 */
export type KillProcess = (pid: number, signal?: string) => void;

/**
 * Interface for a function that spawns a command and returns its child process instance.
 */
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
    readonly env: Record<string, unknown>;

    /** @inheritdoc */
    readonly cwd?: string;

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
        { index, name, command, prefixColor, env, cwd }: CommandInfo & { index: number },
        spawnOpts: SpawnOptions,
        spawn: SpawnCommand,
        killProcess: KillProcess
    ) {
        this.index = index;
        this.name = name;
        this.command = command;
        this.prefixColor = prefixColor;
        this.env = env;
        this.cwd = cwd;
        this.killProcess = killProcess;
        this.spawn = spawn;
        this.spawnOpts = spawnOpts;
    }

    /**
     * Starts this command, piping output, error and close events onto the corresponding observables.
     */
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
        Rx.fromEvent<[number | null, NodeJS.Signals | null]>(child, 'close').subscribe(
            ([exitCode, signal]) => {
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
                        durationSeconds: durationSeconds + durationNanoSeconds / 1e9,
                    },
                });
            }
        );
        child.stdout && pipeTo(Rx.fromEvent<Buffer>(child.stdout, 'data'), this.stdout);
        child.stderr && pipeTo(Rx.fromEvent<Buffer>(child.stderr, 'data'), this.stderr);
        this.stdin = child.stdin;
    }

    /**
     * Kills this command, optionally specifying a signal to send to it.
     */
    kill(code?: string) {
        if (this.killable) {
            this.killed = true;
            this.killProcess(this.pid, code);
        }
    }
}

/**
 * Pipes all events emitted by `stream` into `subject`.
 */
function pipeTo<T>(stream: Rx.Observable<T>, subject: Rx.Subject<T>) {
    stream.subscribe(event => subject.next(event));
}
