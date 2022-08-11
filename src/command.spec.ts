import { SpawnOptions } from 'child_process';
import { EventEmitter } from 'events';
import { Readable, Writable } from 'stream';
import { ChildProcess, Command, CommandInfo, KillProcess, SpawnCommand } from './command';
import { subscribeSpyTo, autoUnsubscribe } from '@hirez_io/observer-spy';

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

const createCommand = (overrides?: Partial<CommandInfo>, spawnOpts?: SpawnOptions) =>
    new Command(
        { index: 0, name: '', command: 'echo foo', ...overrides },
        spawnOpts,
        spawn,
        killProcess
    );

describe('#start()', () => {
    it('spawns process with given command and options', () => {
        const command = createCommand({}, { detached: true });
        command.start();

        expect(spawn).toHaveBeenCalledTimes(1);
        expect(spawn).toHaveBeenCalledWith(command.command, { detached: true });
    });

    it('sets stdin, process and PID', () => {
        const command = createCommand();
        command.start();

        expect(command.process).toBe(process);
        expect(command.pid).toBe(process.pid);
        expect(command.stdin).toBe(process.stdin);
    });

    it('shares errors to the error stream', () => {
        const command = createCommand();
        const observerSpy = subscribeSpyTo(command.error);
        command.start();
        process.emit('error', 'foo');

        expect(observerSpy.getFirstValue()).toBe('foo');
        expect(command.process).toBeUndefined();
    });

    it('shares start and close timing events to the timing stream', () => {
        const command = createCommand();
        const observerSpy = subscribeSpyTo(command.timer);
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 1000);
        jest.spyOn(Date, 'now')
            .mockReturnValueOnce(startDate.getTime())
            .mockReturnValueOnce(endDate.getTime());
        command.start();
        process.emit('close', 0, null);

        expect(observerSpy.getValueAt(0)).toEqual({ startDate, endDate: undefined });
        expect(observerSpy.getValueAt(1)).toEqual({ startDate, endDate });
    });

    it('shares start and error timing events to the timing stream', () => {
        const command = createCommand();
        const observerSpy = subscribeSpyTo(command.timer);
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 1000);
        jest.spyOn(Date, 'now')
            .mockReturnValueOnce(startDate.getTime())
            .mockReturnValueOnce(endDate.getTime());
        command.start();
        process.emit('error', 0, null);

        expect(observerSpy.getValueAt(0)).toEqual({ startDate, endDate: undefined });
        expect(observerSpy.getValueAt(1)).toEqual({ startDate, endDate });
    });

    it('shares closes to the close stream with exit code', () => {
        const command = createCommand();
        const observerSpy = subscribeSpyTo(command.close);
        command.start();
        process.emit('close', 0, null);

        expect(observerSpy.getFirstValue()).toMatchObject({ exitCode: 0, killed: false });
        expect(command.process).toBeUndefined();
    });

    it('shares closes to the close stream with signal', () => {
        const command = createCommand();
        const observerSpy = subscribeSpyTo(command.close);
        command.start();
        process.emit('close', null, 'SIGKILL');

        expect(observerSpy.getFirstValue()).toMatchObject({ exitCode: 'SIGKILL', killed: false });
    });

    it('shares closes to the close stream with timing information', () => {
        const command = createCommand();
        const observerSpy = subscribeSpyTo(command.close);
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

        expect(observerSpy.getFirstValue().timings).toStrictEqual({
            startDate,
            endDate,
            durationSeconds: 1.1,
        });
    });

    it('shares closes to the close stream with command info', () => {
        const commandInfo = {
            command: 'cmd',
            name: 'name',
            prefixColor: 'green',
            env: { VAR: 'yes' },
        };
        const command = createCommand(commandInfo);
        const observerSpy = subscribeSpyTo(command.close);
        command.start();
        process.emit('close', 0, null);

        expect(observerSpy.getFirstValue().command).toEqual(expect.objectContaining(commandInfo));
        expect(observerSpy.getFirstValue().killed).toBe(false);
    });

    it('shares stdout to the stdout stream', () => {
        const command = createCommand();
        const observerSpy = subscribeSpyTo(command.stdout);
        command.start();
        process.stdout.emit('data', Buffer.from('hello'));

        expect(observerSpy.getFirstValue().toString()).toBe('hello');
    });

    it('shares stderr to the stdout stream', () => {
        const command = createCommand();
        const observerSpy = subscribeSpyTo(command.stderr);
        command.start();
        process.stderr.emit('data', Buffer.from('dang'));

        expect(observerSpy.getFirstValue().toString()).toBe('dang');
    });
});

describe('#kill()', () => {
    let command: Command;
    beforeEach(() => {
        command = createCommand();
    });

    it('kills process', () => {
        command.start();
        command.kill();

        expect(killProcess).toHaveBeenCalledTimes(1);
        expect(killProcess).toHaveBeenCalledWith(command.pid, undefined);
    });

    it('kills process with some signal', () => {
        command.start();
        command.kill('SIGKILL');

        expect(killProcess).toHaveBeenCalledTimes(1);
        expect(killProcess).toHaveBeenCalledWith(command.pid, 'SIGKILL');
    });

    it('does not try to kill inexistent process', () => {
        command.start();
        process.emit('error');
        command.kill();

        expect(killProcess).not.toHaveBeenCalled();
    });

    it('marks the command as killed', () => {
        command.start();
        const observerSpy = subscribeSpyTo(command.close);
        command.kill();
        process.emit('close', 1, null);

        expect(observerSpy.getFirstValue()).toMatchObject({ exitCode: 1, killed: true });
    });
});
