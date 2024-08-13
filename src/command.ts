import {
    ChildProcess as BaseChildProcess,
    MessageOptions,
    SendHandle,
    SpawnOptions,
} from 'child_process';
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
     * Color to use on prefix of the command.
     */
    prefixColor?: string;

    /**
     * Whether sending of messages to/from this command (also known as "inter-process communication")
     * should be enabled.
     *
     * @default false
     */
    ipc?: boolean;

    /**
     * Output command in raw format.
     */
    raw?: boolean;
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

export interface MessageEvent {
    message: object;
    handle?: SendHandle;
}

interface OutgoingMessageEvent extends MessageEvent {
    options?: MessageOptions;
    onSent(error?: unknown): void;
}

/**
 * Subtype of NodeJS's child_process including only what's actually needed for a command to work.
 */
export type ChildProcess = EventEmitter &
    Pick<BaseChildProcess, 'pid' | 'stdin' | 'stdout' | 'stderr' | 'send'>;

/**
 * Interface for a function that must kill the process with `pid`, optionally sending `signal` to it.
 */
export type KillProcess = (pid: number, signal?: string) => void;

/**
 * Interface for a function that spawns a command and returns its child process instance.
 */
export type SpawnCommand = (command: string, options: SpawnOptions) => ChildProcess;

/**
 * The state of a command.
 *
 * - `stopped`: command was never started
 * - `started`: command is currently running
 * - `errored`: command failed spawning
 * - `exited`: command is not running anymore, e.g. it received a close event
 */
type CommandState = 'stopped' | 'started' | 'errored' | 'exited';

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
    readonly prefixColor?: string;

    /** @inheritdoc */
    readonly env: Record<string, unknown>;

    /** @inheritdoc */
    readonly cwd?: string;

    /** @inheritdoc */
    readonly ipc?: boolean = false;

    readonly close = new Rx.Subject<CloseEvent>();
    readonly error = new Rx.Subject<unknown>();
    readonly stdout = new Rx.Subject<Buffer>();
    readonly stderr = new Rx.Subject<Buffer>();
    readonly timer = new Rx.Subject<TimerEvent>();
    readonly messages = {
        incoming: new Rx.Subject<MessageEvent>(),
        outgoing: new Rx.ReplaySubject<OutgoingMessageEvent>(),
    };

    process?: ChildProcess;

    // TODO: Should exit/error/stdio subscriptions be added here?
    private subscriptions: readonly Rx.Subscription[] = [];
    stdin?: Writable;
    pid?: number;
    killed = false;
    exited = false;

    state: CommandState = 'stopped';

    constructor(
        { index, name, command, prefixColor, env, cwd, ipc }: CommandInfo & { index: number },
        spawnOpts: SpawnOptions,
        spawn: SpawnCommand,
        killProcess: KillProcess,
    ) {
        this.index = index;
        this.name = name;
        this.command = command;
        this.prefixColor = prefixColor;
        this.env = env || {};
        this.cwd = cwd;
        this.ipc = ipc;
        this.killProcess = killProcess;
        this.spawn = spawn;
        this.spawnOpts = spawnOpts;
    }

    /**
     * Starts this command, piping output, error and close events onto the corresponding observables.
     */
    start() {
        const child = this.spawn(this.command, this.spawnOpts);
        this.state = 'started';
        this.process = child;
        this.pid = child.pid;
        const startDate = new Date(Date.now());
        const highResStartTime = process.hrtime();
        this.timer.next({ startDate });

        this.subscriptions = [...this.maybeSetupIPC(child)];
        Rx.fromEvent(child, 'error').subscribe((event) => {
            this.cleanUp();
            const endDate = new Date(Date.now());
            this.timer.next({ startDate, endDate });
            this.error.next(event);
            this.state = 'errored';
        });
        Rx.fromEvent(child, 'close')
            .pipe(Rx.map((event) => event as [number | null, NodeJS.Signals | null]))
            .subscribe(([exitCode, signal]) => {
                this.cleanUp();

                // Don't override error event
                if (this.state !== 'errored') {
                    this.state = 'exited';
                }

                const endDate = new Date(Date.now());
                this.timer.next({ startDate, endDate });
                const [durationSeconds, durationNanoSeconds] = process.hrtime(highResStartTime);
                this.close.next({
                    command: this,
                    index: this.index,
                    exitCode: exitCode ?? String(signal),
                    killed: this.killed,
                    timings: {
                        startDate,
                        endDate,
                        durationSeconds: durationSeconds + durationNanoSeconds / 1e9,
                    },
                });
            });
        child.stdout &&
            pipeTo(
                Rx.fromEvent(child.stdout, 'data').pipe(Rx.map((event) => event as Buffer)),
                this.stdout,
            );
        child.stderr &&
            pipeTo(
                Rx.fromEvent(child.stderr, 'data').pipe(Rx.map((event) => event as Buffer)),
                this.stderr,
            );
        this.stdin = child.stdin || undefined;
    }

    private maybeSetupIPC(child: ChildProcess) {
        if (!this.ipc) {
            return [];
        }

        return [
            pipeTo(
                Rx.fromEvent(child, 'message').pipe(
                    Rx.map((event) => {
                        const [message, handle] = event as [object, SendHandle | undefined];
                        return { message, handle };
                    }),
                ),
                this.messages.incoming,
            ),
            this.messages.outgoing.subscribe((message) => {
                if (!child.send) {
                    return message.onSent(new Error('Command does not have an IPC channel'));
                }

                child.send(message.message, message.handle, message.options, (error) => {
                    message.onSent(error);
                });
            }),
        ];
    }

    /**
     * Sends a message to the underlying process once it starts.
     *
     * @throws  If the command doesn't have an IPC channel enabled
     * @returns Promise that resolves when the message is sent,
     *          or rejects if it fails to deliver the message.
     */
    send(message: object, handle?: SendHandle, options?: MessageOptions): Promise<void> {
        if (!this.ipc) {
            throw new Error('Command IPC is disabled');
        }
        return new Promise((resolve, reject) => {
            this.messages.outgoing.next({
                message,
                handle,
                options,
                onSent(error) {
                    error ? reject(error) : resolve();
                },
            });
        });
    }

    /**
     * Kills this command, optionally specifying a signal to send to it.
     */
    kill(code?: string) {
        if (Command.canKill(this)) {
            this.killed = true;
            this.killProcess(this.pid, code);
        }
    }

    private cleanUp() {
        this.subscriptions?.forEach((sub) => sub.unsubscribe());
        this.messages.outgoing = new Rx.ReplaySubject();
        this.process = undefined;
    }

    /**
     * Detects whether a command can be killed.
     *
     * Also works as a type guard on the input `command`.
     */
    static canKill(command: Command): command is Command & { pid: number; process: ChildProcess } {
        return !!command.pid && !!command.process;
    }
}

/**
 * Pipes all events emitted by `stream` into `subject`.
 */
function pipeTo<T>(stream: Rx.Observable<T>, subject: Rx.Subject<T>) {
    return stream.subscribe((event) => subject.next(event));
}
