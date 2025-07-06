import { ChildProcess } from 'node:child_process';

import { afterEach, describe, expect, it, Mock, vi } from 'vitest';

import { SpawnCommand } from '../command.js';
import { createMockInstance } from '../fixtures/create-mock-instance.js';
import { createFakeProcess, FakeCommand } from '../fixtures/fake-command.js';
import { Logger } from '../logger.js';
import * as spawn from '../spawn.js';
import { Teardown } from './teardown.js';

const spySpawn = vi
    .spyOn(spawn, 'spawn')
    .mockImplementation(() => createFakeProcess(1) as ChildProcess) as Mock;
const logger = createMockInstance(Logger);
const commands = [new FakeCommand()];
const teardown = 'cowsay bye';

afterEach(() => {
    vi.clearAllMocks();
});

const create = (teardown: string[], spawn?: SpawnCommand) =>
    new Teardown({
        spawn,
        logger,
        commands: teardown,
    });

it('returns commands unchanged', () => {
    const { commands: actual } = create([]).handle(commands);
    expect(actual).toBe(commands);
});

describe('onFinish callback', () => {
    it('does not spawn nothing if there are no teardown commands', () => {
        create([]).handle(commands).onFinish();
        expect(spySpawn).not.toHaveBeenCalled();
    });

    it('runs teardown command', () => {
        create([teardown]).handle(commands).onFinish();
        expect(spySpawn).toHaveBeenCalledWith(teardown, spawn.getSpawnOpts({ stdio: 'raw' }));
    });

    it('runs teardown command with custom spawn function', () => {
        const customSpawn = vi.fn(() => createFakeProcess(1));
        create([teardown], customSpawn).handle(commands).onFinish();
        expect(customSpawn).toHaveBeenCalledWith(teardown, spawn.getSpawnOpts({ stdio: 'raw' }));
    });

    it('waits for teardown command to close', async () => {
        const child = createFakeProcess(1);
        spySpawn.mockReturnValue(child);

        const result = create([teardown]).handle(commands).onFinish();
        child.emit('close', 1, null);
        await expect(result).resolves.toBeUndefined();
    });

    it('rejects if teardown command errors (string)', async () => {
        const child = createFakeProcess(1);
        spySpawn.mockReturnValue(child);

        const result = create([teardown]).handle(commands).onFinish();
        const error = 'fail';
        child.emit('error', error);
        await expect(result).rejects.toBeUndefined();
        expect(logger.logGlobalEvent).toHaveBeenLastCalledWith('fail');
    });

    it('rejects if teardown command errors (error)', async () => {
        const child = createFakeProcess(1);
        spySpawn.mockReturnValue(child);

        const result = create([teardown]).handle(commands).onFinish();
        const error = new Error('fail');
        child.emit('error', error);
        await expect(result).rejects.toBeUndefined();
        expect(logger.logGlobalEvent).toHaveBeenLastCalledWith(
            expect.stringMatching(/Error: fail/),
        );
    });

    it('rejects if teardown command errors (error, no stack)', async () => {
        const child = createFakeProcess(1);
        spySpawn.mockReturnValue(child);

        const result = create([teardown]).handle(commands).onFinish();
        const error = new Error('fail');
        delete error.stack;
        child.emit('error', error);
        await expect(result).rejects.toBeUndefined();
        expect(logger.logGlobalEvent).toHaveBeenLastCalledWith('Error: fail');
    });

    it('runs multiple teardown commands in sequence', async () => {
        const child1 = createFakeProcess(1);
        const child2 = createFakeProcess(2);
        spySpawn.mockReturnValueOnce(child1).mockReturnValueOnce(child2);

        const result = create(['foo', 'bar']).handle(commands).onFinish();

        expect(spySpawn).toHaveBeenCalledTimes(1);
        expect(spySpawn).toHaveBeenLastCalledWith('foo', spawn.getSpawnOpts({ stdio: 'raw' }));

        child1.emit('close', 1, null);
        await new Promise((resolve) => setTimeout(resolve));

        expect(spySpawn).toHaveBeenCalledTimes(2);
        expect(spySpawn).toHaveBeenLastCalledWith('bar', spawn.getSpawnOpts({ stdio: 'raw' }));

        child2.emit('close', 0, null);
        await expect(result).resolves.toBeUndefined();
    });

    it('stops running teardown commands on SIGINT', async () => {
        const child = createFakeProcess(1);
        spySpawn.mockReturnValue(child);

        const result = create(['foo', 'bar']).handle(commands).onFinish();
        child.emit('close', null, 'SIGINT');
        await result;

        expect(spySpawn).toHaveBeenCalledTimes(1);
        expect(spySpawn).toHaveBeenLastCalledWith('foo', expect.anything());
    });
});
