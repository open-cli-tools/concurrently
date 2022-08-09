import { SpawnOptions } from 'child_process';
import { EventEmitter } from 'events';
import { Readable, Writable } from 'stream';
import { ChildProcess, Command, CommandInfo, KillProcess, SpawnCommand } from './command';
import { buffer } from 'rxjs/operators';

let process: ChildProcess;
let spawn: jest.Mocked<SpawnCommand>;
let killProcess: KillProcess;

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
        return new Promise<void>(done => {
            const command = createCommand();
            command.error.subscribe(data => {
                expect(data).toBe('foo');
                expect(command.process).toBeUndefined();
                done();
            });

            command.start();
            process.emit('error', 'foo');
        });
    });

    it('shares start and close timing events to the timing stream', () => {
        return new Promise<void>(done => {
            const command = createCommand();

            const startDate = new Date();
            const endDate = new Date(startDate.getTime() + 1000);
            jest.spyOn(Date, 'now')
                .mockReturnValueOnce(startDate.getTime())
                .mockReturnValueOnce(endDate.getTime());

            command.timer.pipe(buffer(command.close)).subscribe(events => {
                expect(events[0].startDate).toStrictEqual(startDate);
                expect(events[0].endDate).toBeUndefined();
                expect(events[1].startDate).toStrictEqual(startDate);
                expect(events[1].endDate).toStrictEqual(endDate);
                done();
            }, done);

            command.start();
            process.emit('close', 0, null);
        });
    });

    it('shares start and error timing events to the timing stream', () => {
        return new Promise<void>(done => {
            const command = createCommand();

            const startDate = new Date();
            const endDate = new Date(startDate.getTime() + 1000);
            jest.spyOn(Date, 'now')
                .mockReturnValueOnce(startDate.getTime())
                .mockReturnValueOnce(endDate.getTime());

            command.timer.pipe(buffer(command.error)).subscribe(events => {
                expect(events[0].startDate).toStrictEqual(startDate);
                expect(events[0].endDate).toBeUndefined();
                expect(events[1].startDate).toStrictEqual(startDate);
                expect(events[1].endDate).toStrictEqual(endDate);
                done();
            }, done);

            command.start();
            process.emit('error', 0, null);
        });
    });

    it('shares closes to the close stream with exit code', () => {
        return new Promise<void>(done => {
            const command = createCommand();

            command.close.subscribe(data => {
                expect(data.exitCode).toBe(0);
                expect(data.killed).toBe(false);
                expect(command.process).toBeUndefined();
                done();
            });

            command.start();
            process.emit('close', 0, null);
        });
    });

    it('shares closes to the close stream with signal', () => {
        return new Promise<void>(done => {
            const command = createCommand();

            command.close.subscribe(data => {
                expect(data.exitCode).toBe('SIGKILL');
                expect(data.killed).toBe(false);
                done();
            });

            command.start();
            process.emit('close', null, 'SIGKILL');
        });
    });

    it('shares closes to the close stream with timing information', () => {
        return new Promise<void>(done => {
            const command = createCommand();

            const startDate = new Date();
            const endDate = new Date(startDate.getTime() + 1000);
            jest.spyOn(Date, 'now')
                .mockReturnValueOnce(startDate.getTime())
                .mockReturnValueOnce(endDate.getTime());

            jest.spyOn(global.process, 'hrtime')
                .mockReturnValueOnce([0, 0])
                .mockReturnValueOnce([1, 1e8]);

            command.close.subscribe(data => {
                expect(data.timings.startDate).toStrictEqual(startDate);
                expect(data.timings.endDate).toStrictEqual(endDate);
                expect(data.timings.durationSeconds).toBe(1.1);
                done();
            });

            command.start();
            process.emit('close', null, 'SIGKILL');
        });
    });

    it('shares closes to the close stream with command info', () => {
        return new Promise<void>(done => {
            const commandInfo = {
                command: 'cmd',
                name: 'name',
                prefixColor: 'green',
                env: { VAR: 'yes' },
            };
            const command = createCommand(commandInfo);

            command.close.subscribe(data => {
                expect(data.command).toEqual(expect.objectContaining(commandInfo));
                expect(data.killed).toBe(false);
                done();
            });

            command.start();
            process.emit('close', 0, null);
        });
    });

    it('shares stdout to the stdout stream', () => {
        return new Promise<void>(done => {
            const command = createCommand();

            command.stdout.subscribe(data => {
                expect(data.toString()).toBe('hello');
                done();
            });

            command.start();
            process.stdout.emit('data', Buffer.from('hello'));
        });
    });

    it('shares stderr to the stdout stream', () => {
        return new Promise<void>(done => {
            const command = createCommand();

            command.stderr.subscribe(data => {
                expect(data.toString()).toBe('dang');
                done();
            });

            command.start();
            process.stderr.emit('data', Buffer.from('dang'));
        });
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
        return new Promise<void>(done => {
            command.start();

            command.close.subscribe(data => {
                expect(data.exitCode).toBe(1);
                expect(data.killed).toBe(true);
                done();
            });

            command.kill();
            process.emit('close', 1, null);
        });
    });
});
