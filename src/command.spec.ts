import { autoUnsubscribe, subscribeSpyTo } from '@hirez_io/observer-spy';
import { SendHandle, SpawnOptions } from 'child_process';
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
let sendMessage: jest.Mock;
let spawn: jest.Mocked<SpawnCommand>;
let killProcess: KillProcess;

const IPC_FD = 3;

autoUnsubscribe();

beforeEach(() => {
    sendMessage = jest.fn();
    process = new (class extends EventEmitter {
        readonly pid = 1;
        send = sendMessage;
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

        it('does not change state if there was an error', () => {
            const { command } = createCommand();
            command.start();
            process.emit('error', 'foo');
            process.emit('close', 0, null);
            expect(command.state).toBe('errored');
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

    describe('on incoming messages', () => {
        it('does not share to the incoming messages stream, if IPC is disabled', () => {
            const { command } = createCommand();
            const spy = subscribeSpyTo(command.messages.incoming);
            command.start();

            process.emit('message', {});
            expect(spy.getValuesLength()).toBe(0);
        });

        it('shares to the incoming messages stream, if IPC is enabled', () => {
            const { command } = createCommand({ ipc: IPC_FD });
            const spy = subscribeSpyTo(command.messages.incoming);
            command.start();

            const message1 = {};
            process.emit('message', message1, undefined);

            const message2 = {};
            const handle = {} as SendHandle;
            process.emit('message', message2, handle);

            expect(spy.getValuesLength()).toBe(2);
            expect(spy.getValueAt(0)).toEqual({ message: message1, handle: undefined });
            expect(spy.getValueAt(1)).toEqual({ message: message2, handle });
        });
    });

    describe('on outgoing messages', () => {
        it('calls onSent with an error if the process does not have IPC enabled', () => {
            const { command } = createCommand({ ipc: IPC_FD });
            command.start();

            Object.assign(process, {
                // The TS types don't assume `send` can be undefined,
                // despite the Node docs saying so
                send: undefined,
            });

            const onSent = jest.fn();
            command.messages.outgoing.next({ message: {}, onSent });
            expect(onSent).toHaveBeenCalledWith(expect.any(Error));
        });

        it('sends the message to the process', () => {
            const { command } = createCommand({ ipc: IPC_FD });
            command.start();

            const message1 = {};
            command.messages.outgoing.next({ message: message1, onSent() {} });

            const message2 = {};
            const handle = {} as SendHandle;
            command.messages.outgoing.next({ message: message2, handle, onSent() {} });

            const message3 = {};
            const options = {};
            command.messages.outgoing.next({ message: message3, options, onSent() {} });

            expect(process.send).toHaveBeenCalledTimes(3);
            expect(process.send).toHaveBeenNthCalledWith(
                1,
                message1,
                undefined,
                undefined,
                expect.any(Function),
            );
            expect(process.send).toHaveBeenNthCalledWith(
                2,
                message2,
                handle,
                undefined,
                expect.any(Function),
            );
            expect(process.send).toHaveBeenNthCalledWith(
                3,
                message3,
                undefined,
                options,
                expect.any(Function),
            );
        });

        it('sends the message to the process, if it starts late', () => {
            const { command } = createCommand({ ipc: IPC_FD });
            command.messages.outgoing.next({ message: {}, onSent() {} });
            expect(process.send).not.toHaveBeenCalled();

            command.start();
            expect(process.send).toHaveBeenCalled();
        });

        it('calls onSent with the result of sending the message', () => {
            const { command } = createCommand({ ipc: IPC_FD });
            command.start();

            const onSent = jest.fn();
            command.messages.outgoing.next({ message: {}, onSent });
            expect(onSent).not.toHaveBeenCalled();

            sendMessage.mock.calls[0][3]();
            expect(onSent).toHaveBeenCalledWith(undefined);

            const error = new Error();
            sendMessage.mock.calls[0][3](error);
            expect(onSent).toHaveBeenCalledWith(error);
        });
    });
});

describe('#send()', () => {
    it('throws if IPC is not set up', () => {
        const { command } = createCommand({ ipc: IPC_FD });
        const fn = () => command.send({});
        expect(fn).toThrow();
    });

    it('pushes the message on the outgoing messages stream', () => {
        const { command } = createCommand({ ipc: IPC_FD });
        const spy = subscribeSpyTo(command.messages.outgoing);

        const message1 = { foo: true };
        command.send(message1);

        const message2 = { bar: 123 };
        const handle = {} as SendHandle;
        command.send(message2, handle);

        const message3 = { baz: 'yes' };
        const options = {};
        command.send(message3, undefined, options);

        expect(spy.getValuesLength()).toBe(3);
        expect(spy.getValueAt(0)).toMatchObject({
            message: message1,
            handle: undefined,
            options: undefined,
        });
        expect(spy.getValueAt(1)).toMatchObject({ message: message2, handle, options: undefined });
        expect(spy.getValueAt(2)).toMatchObject({ message: message3, handle: undefined, options });
    });

    it('resolves when onSent callback is called with no arguments', async () => {
        const { command } = createCommand({ ipc: IPC_FD });
        const spy = subscribeSpyTo(command.messages.outgoing);
        const promise = command.send({});
        spy.getFirstValue().onSent();
        await expect(promise).resolves.toBeUndefined();
    });

    it('rejects when onSent callback is called with an argument', async () => {
        const { command } = createCommand({ ipc: IPC_FD });
        const spy = subscribeSpyTo(command.messages.outgoing);
        const promise = command.send({});
        spy.getFirstValue().onSent('foo');
        await expect(promise).rejects.toBe('foo');
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
