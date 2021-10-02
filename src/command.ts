import { ChildProcess, SpawnOptions } from 'child_process';
import * as Rx from 'rxjs';
import { Writable } from 'stream';

export interface CommandInfo {
    command: string;
    name?: string;
    prefixColor?: string;
    env?: object;
    cwd?: string;
}
export interface CommandParams extends CommandInfo {
    index: number;
    killProcess(pid: number, code?: string): void;
    spawn(command: string, opts: SpawnOptions): ChildProcess;
    spawnOpts?: SpawnOptions;
}

export interface CommandCloseEvent {
    command: CommandInfo;
    index: number;
    exitCode: NodeJS.Signals | number;
    killed: boolean;
}

export interface Command {
    readonly command: string;
    readonly index: number;
    readonly name: string;
    pid?: number;
    killed?: boolean;
    error: Rx.Subject<Error>;
    close: Rx.Subject<CommandCloseEvent>;
    stdout: Rx.Subject<string>;
    stderr: Rx.Subject<string>;
    stdin?: Writable;
    start(): void;
    kill(signal?: NodeJS.Signals): void;
}

export class CommandImpl implements Command {
    get killable() {
        return !!this.process;
    }

    pid?: number;
    process?: ChildProcess;
    killed = false;
    readonly index: number;
    readonly name: string;
    readonly command: string;
    readonly prefixColor?: string;
    readonly env: object;
    private readonly spawnOpts: SpawnOptions;
    readonly error = new Rx.Subject<Error>();
    readonly close = new Rx.Subject<CommandCloseEvent>();
    readonly stdout = new Rx.Subject<string>();
    readonly stderr = new Rx.Subject<string>();
    stdin?: Writable;

    private readonly spawn: (command: string, opts: SpawnOptions) => ChildProcess;
    private readonly killProcess: (pid: number, code?: NodeJS.Signals) => void;

    constructor({ index, name, command, prefixColor, env, killProcess, spawn, spawnOpts }: CommandParams) {
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

        Rx.fromEvent<Error>(child, 'error').subscribe(event => {
            this.process = undefined;
            this.error.next(event);
        });
        Rx.fromEvent<[number, NodeJS.Signals]>(child, 'close').subscribe(([exitCode, signal]) => {
            this.process = undefined;
            this.close.next({
                command: {
                    command: this.command,
                    name: this.name,
                    prefixColor: this.prefixColor,
                    env: this.env,
                },
                index: this.index,
                exitCode: exitCode === null ? signal : exitCode,
                killed: this.killed,
            });
        });
        child.stdout && pipeTo(Rx.fromEvent(child.stdout, 'data'), this.stdout);
        child.stderr && pipeTo(Rx.fromEvent(child.stderr, 'data'), this.stderr);
        this.stdin = child.stdin;
    }

    kill(code?: NodeJS.Signals) {
        if (this.killable) {
            this.killed = true;
            this.killProcess(this.pid, code);
        }
    }
};

function pipeTo(stream, subject) {
    stream.subscribe(event => subject.next(event));
}
