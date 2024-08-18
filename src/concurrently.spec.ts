import { createMockInstance } from 'jest-create-mock-instance';
import os from 'os';
import { Writable } from 'stream';

import { ChildProcess, KillProcess, SpawnCommand } from './command';
import { concurrently, ConcurrentlyCommandInput, ConcurrentlyOptions } from './concurrently';
import { createFakeProcess, FakeCommand } from './fixtures/fake-command';
import { FlowController } from './flow-control/flow-controller';
import { Logger } from './logger';

let spawn: SpawnCommand;
let kill: KillProcess;
let onFinishHooks: (() => void)[];
let controllers: jest.Mocked<FlowController>[];
let processes: ChildProcess[];
const create = (commands: ConcurrentlyCommandInput[], options: Partial<ConcurrentlyOptions> = {}) =>
    concurrently(commands, Object.assign(options, { controllers, spawn, kill }));

beforeEach(() => {
    jest.resetAllMocks();

    processes = [];
    spawn = jest.fn(() => {
        const process = createFakeProcess(processes.length);
        processes.push(process);
        return process;
    });
    kill = jest.fn();

    onFinishHooks = [jest.fn(), jest.fn()];
    controllers = [
        { handle: jest.fn((commands) => ({ commands, onFinish: onFinishHooks[0] })) },
        { handle: jest.fn((commands) => ({ commands, onFinish: onFinishHooks[1] })) },
    ];
});

it('fails if commands is not an array', () => {
    const bomb = () => create('foo' as never);
    expect(bomb).toThrow();
});

it('fails if no commands were provided', () => {
    const bomb = () => create([]);
    expect(bomb).toThrow();
});

it('spawns all commands', () => {
    create(['echo', 'kill']);
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(spawn).toHaveBeenCalledWith('echo', expect.objectContaining({}));
    expect(spawn).toHaveBeenCalledWith('kill', expect.objectContaining({}));
});

it('log output is passed to output stream if logger is specified in options', () => {
    const logger = new Logger({ hide: [] });
    const outputStream = createMockInstance(Writable);
    create(['foo'], { logger, outputStream });
    logger.log('foo', 'bar');

    expect(outputStream.write).toHaveBeenCalledTimes(2);
    expect(outputStream.write).toHaveBeenCalledWith('foo');
    expect(outputStream.write).toHaveBeenCalledWith('bar');
});

it('spawns commands up to configured limit at once', () => {
    create(['foo', 'bar', 'baz', 'qux'], { maxProcesses: 2 });
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(spawn).toHaveBeenCalledWith('foo', expect.objectContaining({}));
    expect(spawn).toHaveBeenCalledWith('bar', expect.objectContaining({}));

    // Test out of order completion picking up new processes in-order
    processes[1].emit('close', 1, null);
    expect(spawn).toHaveBeenCalledTimes(3);
    expect(spawn).toHaveBeenCalledWith('baz', expect.objectContaining({}));

    processes[0].emit('close', null, 'SIGINT');
    expect(spawn).toHaveBeenCalledTimes(4);
    expect(spawn).toHaveBeenCalledWith('qux', expect.objectContaining({}));

    // Shouldn't attempt to spawn anything else.
    processes[2].emit('close', 1, null);
    expect(spawn).toHaveBeenCalledTimes(4);
});

it('spawns commands up to percent based limit at once', () => {
    // Mock architecture with 4 cores
    const cpusSpy = jest.spyOn(os, 'cpus');
    cpusSpy.mockReturnValue(
        new Array(4).fill({
            model: 'Intel',
            speed: 0,
            times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
        }),
    );

    create(['foo', 'bar', 'baz', 'qux'], { maxProcesses: '50%' });

    // Max parallel processes should be 2 (50% of 4 cores)
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(spawn).toHaveBeenCalledWith('foo', expect.objectContaining({}));
    expect(spawn).toHaveBeenCalledWith('bar', expect.objectContaining({}));

    // Close first process and expect third to be spawned
    processes[0].emit('close', 1, null);
    expect(spawn).toHaveBeenCalledTimes(3);
    expect(spawn).toHaveBeenCalledWith('baz', expect.objectContaining({}));

    // Close second process and expect fourth to be spawned
    processes[1].emit('close', 1, null);
    expect(spawn).toHaveBeenCalledTimes(4);
    expect(spawn).toHaveBeenCalledWith('qux', expect.objectContaining({}));
});

it('does not spawn further commands on abort signal aborted', () => {
    const abortController = new AbortController();
    create(['foo', 'bar'], { maxProcesses: 1, abortSignal: abortController.signal });
    expect(spawn).toHaveBeenCalledTimes(1);

    abortController.abort();
    processes[0].emit('close', 0, null);
    expect(spawn).toHaveBeenCalledTimes(1);
});

it('runs controllers with the commands', () => {
    create(['echo', '"echo wrapped"']);

    controllers.forEach((controller) => {
        expect(controller.handle).toHaveBeenCalledWith([
            expect.objectContaining({ command: 'echo', index: 0 }),
            expect.objectContaining({ command: 'echo wrapped', index: 1 }),
        ]);
    });
});

it('runs commands with a name or prefix color', () => {
    create([{ command: 'echo', prefixColor: 'red', name: 'foo' }, 'kill']);

    controllers.forEach((controller) => {
        expect(controller.handle).toHaveBeenCalledWith([
            expect.objectContaining({ command: 'echo', index: 0, name: 'foo', prefixColor: 'red' }),
            expect.objectContaining({ command: 'kill', index: 1, name: '', prefixColor: '' }),
        ]);
    });
});

it('runs commands with a list of colors', () => {
    create(['echo', 'kill'], {
        prefixColors: ['red'],
    });

    controllers.forEach((controller) => {
        expect(controller.handle).toHaveBeenCalledWith([
            expect.objectContaining({ command: 'echo', prefixColor: 'red' }),
            expect.objectContaining({ command: 'kill', prefixColor: 'red' }),
        ]);
    });
});

it('passes commands wrapped from a controller to the next one', () => {
    const fakeCommand = new FakeCommand('banana', 'banana');
    controllers[0].handle.mockReturnValue({ commands: [fakeCommand] });

    create(['echo']);

    expect(controllers[0].handle).toHaveBeenCalledWith([
        expect.objectContaining({ command: 'echo', index: 0 }),
    ]);

    expect(controllers[1].handle).toHaveBeenCalledWith([fakeCommand]);

    expect(fakeCommand.start).toHaveBeenCalledTimes(1);
});

it('merges extra env vars into each command', () => {
    create([
        { command: 'echo', env: { foo: 'bar' } },
        { command: 'echo', env: { foo: 'baz' } },
        'kill',
    ]);

    expect(spawn).toHaveBeenCalledTimes(3);
    expect(spawn).toHaveBeenCalledWith(
        'echo',
        expect.objectContaining({
            env: expect.objectContaining({ foo: 'bar' }),
        }),
    );
    expect(spawn).toHaveBeenCalledWith(
        'echo',
        expect.objectContaining({
            env: expect.objectContaining({ foo: 'baz' }),
        }),
    );
    expect(spawn).toHaveBeenCalledWith(
        'kill',
        expect.objectContaining({
            env: expect.not.objectContaining({ foo: expect.anything() }),
        }),
    );
});

it('uses cwd from options for each command', () => {
    create(
        [
            { command: 'echo', env: { foo: 'bar' } },
            { command: 'echo', env: { foo: 'baz' } },
            'kill',
        ],
        {
            cwd: 'foobar',
        },
    );

    expect(spawn).toHaveBeenCalledTimes(3);
    expect(spawn).toHaveBeenCalledWith(
        'echo',
        expect.objectContaining({
            env: expect.objectContaining({ foo: 'bar' }),
            cwd: 'foobar',
        }),
    );
    expect(spawn).toHaveBeenCalledWith(
        'echo',
        expect.objectContaining({
            env: expect.objectContaining({ foo: 'baz' }),
            cwd: 'foobar',
        }),
    );
    expect(spawn).toHaveBeenCalledWith(
        'kill',
        expect.objectContaining({
            env: expect.not.objectContaining({ foo: expect.anything() }),
            cwd: 'foobar',
        }),
    );
});

it('uses overridden cwd option for each command if specified', () => {
    create(
        [
            { command: 'echo', env: { foo: 'bar' }, cwd: 'baz' },
            { command: 'echo', env: { foo: 'baz' } },
        ],
        {
            cwd: 'foobar',
        },
    );

    expect(spawn).toHaveBeenCalledTimes(2);
    expect(spawn).toHaveBeenCalledWith(
        'echo',
        expect.objectContaining({
            env: expect.objectContaining({ foo: 'bar' }),
            cwd: 'baz',
        }),
    );
    expect(spawn).toHaveBeenCalledWith(
        'echo',
        expect.objectContaining({
            env: expect.objectContaining({ foo: 'baz' }),
            cwd: 'foobar',
        }),
    );
});

it('uses raw from options for each command', () => {
    create([{ command: 'echo' }, 'kill'], {
        raw: true,
    });

    expect(spawn).toHaveBeenCalledTimes(2);
    expect(spawn).toHaveBeenCalledWith(
        'echo',
        expect.objectContaining({
            stdio: ['inherit', 'inherit', 'inherit'],
        }),
    );
    expect(spawn).toHaveBeenCalledWith(
        'kill',
        expect.objectContaining({
            stdio: ['inherit', 'inherit', 'inherit'],
        }),
    );
});

it('uses overridden raw option for each command if specified', () => {
    create([{ command: 'echo', raw: false }, { command: 'echo' }], {
        raw: true,
    });

    expect(spawn).toHaveBeenCalledTimes(2);
    expect(spawn).toHaveBeenCalledWith(
        'echo',
        expect.objectContaining({
            stdio: ['pipe', 'pipe', 'pipe'],
        }),
    );
    expect(spawn).toHaveBeenCalledWith(
        'echo',
        expect.objectContaining({
            stdio: ['inherit', 'inherit', 'inherit'],
        }),
    );
});

it('uses hide from options for each command', () => {
    create([{ command: 'echo' }, 'kill'], {
        hide: [1],
    });

    expect(spawn).toHaveBeenCalledTimes(2);
    expect(spawn).toHaveBeenCalledWith(
        'echo',
        expect.objectContaining({
            stdio: ['pipe', 'pipe', 'pipe'],
        }),
    );
    expect(spawn).toHaveBeenCalledWith(
        'kill',
        expect.objectContaining({
            stdio: ['pipe', 'ignore', 'ignore'],
        }),
    );
});

it('hides output for commands even if raw option is on', () => {
    create([{ command: 'echo' }, 'kill'], {
        hide: [1],
        raw: true,
    });

    expect(spawn).toHaveBeenCalledTimes(2);
    expect(spawn).toHaveBeenCalledWith(
        'echo',
        expect.objectContaining({
            stdio: ['inherit', 'inherit', 'inherit'],
        }),
    );
    expect(spawn).toHaveBeenCalledWith(
        'kill',
        expect.objectContaining({
            stdio: ['pipe', 'ignore', 'ignore'],
        }),
    );
});

it('argument placeholders are properly replaced when additional arguments are passed', () => {
    create(
        [
            { command: 'echo {1}' },
            { command: 'echo {@}' },
            { command: 'echo {*}' },
            { command: 'echo \\{@}' },
        ],
        {
            additionalArguments: ['foo', 'bar'],
        },
    );

    expect(spawn).toHaveBeenCalledTimes(4);
    expect(spawn).toHaveBeenCalledWith('echo foo', expect.objectContaining({}));
    expect(spawn).toHaveBeenCalledWith('echo foo bar', expect.objectContaining({}));
    expect(spawn).toHaveBeenCalledWith("echo 'foo bar'", expect.objectContaining({}));
    expect(spawn).toHaveBeenCalledWith('echo {@}', expect.objectContaining({}));
});

it('argument placeholders are not replaced when additional arguments are not defined', () => {
    create([
        { command: 'echo {1}' },
        { command: 'echo {@}' },
        { command: 'echo {*}' },
        { command: 'echo \\{@}' },
    ]);

    expect(spawn).toHaveBeenCalledTimes(4);
    expect(spawn).toHaveBeenCalledWith('echo {1}', expect.objectContaining({}));
    expect(spawn).toHaveBeenCalledWith('echo {@}', expect.objectContaining({}));
    expect(spawn).toHaveBeenCalledWith('echo {*}', expect.objectContaining({}));
    expect(spawn).toHaveBeenCalledWith('echo {@}', expect.objectContaining({}));
});

it('runs onFinish hook after all commands run', async () => {
    const promise = create(['foo', 'bar'], { maxProcesses: 1 });
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(onFinishHooks[0]).not.toHaveBeenCalled();
    expect(onFinishHooks[1]).not.toHaveBeenCalled();

    processes[0].emit('close', 0, null);
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(onFinishHooks[0]).not.toHaveBeenCalled();
    expect(onFinishHooks[1]).not.toHaveBeenCalled();

    processes[1].emit('close', 0, null);
    await promise.result;

    expect(onFinishHooks[0]).toHaveBeenCalled();
    expect(onFinishHooks[1]).toHaveBeenCalled();
});
