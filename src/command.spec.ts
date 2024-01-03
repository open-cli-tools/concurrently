import { autoUnsubscribe, subscribeSpyTo } from '@hirez_io/observer-spy';
import { SpawnOptions } from 'child_process';
import { EventEmitter } from 'events';
import * as Rx from 'rxjs';
import { Readable, Writable } from 'stream';

import {
    ChildProcess,
    CloseEvent,
    Command,
    CommandInfo,
    KillProcess,
    SpawnCommand,
} from './command';

type CommandValues = { error: unknown; close: CloseEvent; timer: unknown[] };

let process: ChildProcess;
let spawn: jest.Mocked<SpawnCommand>;
let killProcess: KillProcess;

autoUnsubscribe();

beforeEach(() => {
    process = new (class extends EventEmitter {
        readonly pid = 1;
        readonly stdout = new Readable({
            read() {
                // do nothing
            },
        });
        readonly stderr = new Readable({
            read() {
                // do nothing
            },
        });
        readonly stdin = new Writable({
            write() {
                // do nothing
            },
        });
    })();
    spawn = jest.fn().mockReturnValue(process);
    killProcess = jest.fn();
});

const createCommand = (overrides?: Partial<CommandInfo>, spawnOpts: SpawnOptions = {}) => {
    const command = new Command(
        { index: 0, name: '', command: 'echo foo', ...overrides },
        spawnOpts,
        spawn,
        killProcess,
    );

    let error: unknown;
    let close: CloseEvent;
    const timer = subscribeSpyTo(command.timer);
    const finished = subscribeSpyTo(
        new Rx.Observable((observer) => {
            // First event in both subjects means command has finished
            command.error.subscribe({
                next: (value) => {
                    error = value;
                    observer.complete();
                },
            });
            command.close.subscribe({
                next: (value) => {
                    close = value;
                    observer.complete();
                },
            });
        }),
    );
    const values = async (): Promise<CommandValues> => {
        await finished.onComplete();
        return { error, close, timer: timer.getValues() };
    };

    return { command, values };
};

it('has stopped state by default', () => {
    const { command } = createCommand();
    expect(command.state).toBe('stopped');
});

describe('#start()', () => {
    it('spawns process with given command and options', () => {
        const { command } = createCommand({}, { detached: true });
        command.start();

        expect(spawn).toHaveBeenCalledTimes(1);
        expect(spawn).toHaveBeenCalledWith(command.command, { detached: true });
    });

    it('sets stdin, process and PID', () => {
        const { command } = createCommand();
        command.start();

        expect(command.process).toBe(process);
        expect(command.pid).toBe(process.pid);
        expect(command.stdin).toBe(process.stdin);
    });

    it('changes state to started', () => {
        const { command } = createCommand();
        command.start();
        expect(command.state).toBe('started');
    });

    describe('on errors', () => {
        it('changes state to errored', () => {
            const { command } = createCommand();
            command.start();
            process.emit('error', 'foo');
            expect(command.state).toBe('errored');
        });

        it('shares to the error stream', async () => {
            const { command, values } = createCommand();
            command.start();
            process.emit('error', 'foo');
            const { error } = await values();

            expect(error).toBe('foo');
            expect(command.process).toBeUndefined();
        });

        it('shares start and error timing events to the timing stream', async () => {
            const { command, values } = createCommand();
            const startDate = new Date();
            const endDate = new Date(startDate.getTime() + 1000);
            jest.spyOn(Date, 'now')
                .mockReturnValueOnce(startDate.getTime())
                .mockReturnValueOnce(endDate.getTime());
            command.start();
            process.emit('error', 0, null);
            const { timer } = await values();

            expect(timer[0]).toEqual({ startDate, endDate: undefined });
            expect(timer[1]).toEqual({ startDate, endDate });
        });
    });

    describe('on close', () => {
        it('changes state to exited', () => {
            const { command } = createCommand();
            command.start();
            process.emit('close', 0, null);
            expect(command.state).toBe('exited');
        });

        it('shares start and close timing events to the timing stream', async () => {
            const { command, values } = createCommand();
            const startDate = new Date();
            const endDate = new Date(startDate.getTime() + 1000);
            jest.spyOn(Date, 'now')
                .mockReturnValueOnce(startDate.getTime())
                .mockReturnValueOnce(endDate.getTime());
            command.start();
            process.emit('close', 0, null);
            const { timer } = await values();

            expect(timer[0]).toEqual({ startDate, endDate: undefined });
            expect(timer[1]).toEqual({ startDate, endDate });
        });

        it('shares to the close stream with exit code', async () => {
            const { command, values } = createCommand();
            command.start();
            process.emit('close', 0, null);
            const { close } = await values();

            expect(close).toMatchObject({ exitCode: 0, killed: false });
            expect(command.process).toBeUndefined();
        });

        it('shares to the close stream with signal', async () => {
            const { command, values } = createCommand();
            command.start();
            process.emit('close', null, 'SIGKILL');
            const { close } = await values();

            expect(close).toMatchObject({ exitCode: 'SIGKILL', killed: false });
        });

        it('shares to the close stream with timing information', async () => {
            const { command, values } = createCommand();
            const startDate = new Date();
            const endDate = new Date(startDate.getTime() + 1000);
            jest.spyOn(Date, 'now')
                .mockReturnValueOnce(startDate.getTime())
                .mockReturnValueOnce(endDate.getTime());
            jest.spyOn(global.process, 'hrtime')
                .mockReturnValueOnce([0, 0])
                .mockReturnValueOnce([1, 1e8]);
            command.start();
            process.emit('close', null, 'SIGKILL');
            const { close } = await values();

            expect(close.timings).toStrictEqual({
                startDate,
                endDate,
                durationSeconds: 1.1,
            });
        });

        it('shares to the close stream with command info', async () => {
            const commandInfo = {
                command: 'cmd',
                name: 'name',
                prefixColor: 'green',
                env: { VAR: 'yes' },
            };
            const { command, values } = createCommand(commandInfo);
            command.start();
            process.emit('close', 0, null);
            const { close } = await values();

            expect(close.command).toEqual(expect.objectContaining(commandInfo));
            expect(close.killed).toBe(false);
        });
    });

    it('shares stdout to the stdout stream', async () => {
        const { command } = createCommand();
        const stdout = Rx.firstValueFrom(command.stdout);
        command.start();
        process.stdout?.emit('data', Buffer.from('hello'));

        expect((await stdout).toString()).toBe('hello');
    });

    it('shares stderr to the stdout stream', async () => {
        const { command } = createCommand();
        const stderr = Rx.firstValueFrom(command.stderr);
        command.start();
        process.stderr?.emit('data', Buffer.from('dang'));

        expect((await stderr).toString()).toBe('dang');
    });
});

describe('#kill()', () => {
    let createdCommand: { command: Command; values: () => Promise<CommandValues> };
    beforeEach(() => {
        createdCommand = createCommand();
    });

    it('kills process', () => {
        createdCommand.command.start();
        createdCommand.command.kill();

        expect(killProcess).toHaveBeenCalledTimes(1);
        expect(killProcess).toHaveBeenCalledWith(createdCommand.command.pid, undefined);
    });

    it('kills process with some signal', () => {
        createdCommand.command.start();
        createdCommand.command.kill('SIGKILL');

        expect(killProcess).toHaveBeenCalledTimes(1);
        expect(killProcess).toHaveBeenCalledWith(createdCommand.command.pid, 'SIGKILL');
    });

    it('does not try to kill inexistent process', () => {
        createdCommand.command.start();
        process.emit('error');
        createdCommand.command.kill();

        expect(killProcess).not.toHaveBeenCalled();
    });

    it('marks the command as killed', async () => {
        createdCommand.command.start();
        createdCommand.command.kill();
        process.emit('close', 1, null);
        const { close } = await createdCommand.values();

        expect(close).toMatchObject({ exitCode: 1, killed: true });
    });
});

describe('.canKill()', () => {
    it('returns whether command has both PID and process', () => {
        const { command } = createCommand();
        expect(Command.canKill(command)).toBe(false);

        command.pid = 1;
        expect(Command.canKill(command)).toBe(false);

        command.process = process;
        expect(Command.canKill(command)).toBe(true);
    });
});
