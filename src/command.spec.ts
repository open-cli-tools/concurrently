const EventEmitter = require('events');
const Command = require('./command');

const createProcess = () => {
    const process = new EventEmitter();
    process.pid = 1;
    return process;
};

const createProcessWithIO = () => {
    const process = createProcess();
    return Object.assign(process, {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        stdin: new EventEmitter()
    });
};

describe('#start()', () => {
    it('spawns process with given command and options', () => {
        const spawn = jest.fn().mockReturnValue(createProcess());
        const command = new Command({
            spawn,
            spawnOpts: { bla: true },
            command: 'echo foo',
        });
        command.start();

        expect(spawn).toHaveBeenCalledTimes(1);
        expect(spawn).toHaveBeenCalledWith(command.command, { bla: true });
    });

    it('sets stdin, process and PID', () => {
        const process = createProcessWithIO();
        const command = new Command({ spawn: () => process });

        command.start();
        expect(command.process).toBe(process);
        expect(command.pid).toBe(process.pid);
        expect(command.stdin).toBe(process.stdin);
    });

    it('shares errors to the error stream', done => {
        const process = createProcess();
        const command = new Command({ spawn: () => process });

        command.error.subscribe(data => {
            expect(data).toBe('foo');
            expect(command.process).toBeUndefined();
            done();
        });

        command.start();
        process.emit('error', 'foo');
    });

    it('shares closes to the close stream with exit code', done => {
        const process = createProcess();
        const command = new Command({ spawn: () => process });

        command.close.subscribe(data => {
            expect(data.exitCode).toBe(0);
            expect(data.killed).toBe(false);
            expect(command.process).toBeUndefined();
            done();
        });

        command.start();
        process.emit('close', 0, null);
    });

    it('shares closes to the close stream with signal', done => {
        const process = createProcess();
        const command = new Command({ spawn: () => process });

        command.close.subscribe(data => {
            expect(data.exitCode).toBe('SIGKILL');
            expect(data.killed).toBe(false);
            done();
        });

        command.start();
        process.emit('close', null, 'SIGKILL');
    });

    it('shares closes to the close stream with command info and index', done => {
        const process = createProcess();
        const commandInfo = {
            command: 'cmd',
            name: 'name',
            prefixColor: 'green',
            env: { VAR: 'yes' },
        };
        const command = new Command(
            Object.assign({
                index: 1,
                spawn: () => process
            }, commandInfo)
        );

        command.close.subscribe(data => {
            expect(data.command).toEqual(commandInfo);
            expect(data.killed).toBe(false);
            expect(data.index).toBe(1);
            done();
        });

        command.start();
        process.emit('close', 0, null);
    });

    it('shares stdout to the stdout stream', done => {
        const process = createProcessWithIO();
        const command = new Command({ spawn: () => process });

        command.stdout.subscribe(data => {
            expect(data.toString()).toBe('hello');
            done();
        });

        command.start();
        process.stdout.emit('data', Buffer.from('hello'));
    });

    it('shares stderr to the stdout stream', done => {
        const process = createProcessWithIO();
        const command = new Command({ spawn: () => process });

        command.stderr.subscribe(data => {
            expect(data.toString()).toBe('dang');
            done();
        });

        command.start();
        process.stderr.emit('data', Buffer.from('dang'));
    });
});

describe('#kill()', () => {
    let process, killProcess, command;
    beforeEach(() => {
        process = createProcess();
        killProcess = jest.fn();
        command = new Command({ spawn: () => process, killProcess });
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

    it('marks the command as killed', done => {
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
