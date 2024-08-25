import createMockInstance from 'jest-create-mock-instance';

import { createFakeProcess, FakeCommand } from '../fixtures/fake-command';
import { Logger } from '../logger';
import { getSpawnOpts } from '../spawn';
import { Teardown } from './teardown';

let spawn: jest.Mock;
let logger: Logger;
const commands = [new FakeCommand()];
const teardown = 'cowsay bye';

beforeEach(() => {
    logger = createMockInstance(Logger);
    spawn = jest.fn(() => createFakeProcess(1));
});

const create = (teardown: string[]) =>
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
        expect(spawn).not.toHaveBeenCalled();
    });

    it('runs teardown command', () => {
        create([teardown]).handle(commands).onFinish();
        expect(spawn).toHaveBeenCalledWith(teardown, getSpawnOpts({ stdio: 'raw' }));
    });

    it('waits for teardown command to close', async () => {
        const child = createFakeProcess(1);
        spawn.mockReturnValue(child);

        const result = create([teardown]).handle(commands).onFinish();
        child.emit('close', 1, null);
        await expect(result).resolves.toBeUndefined();
    });

    it('rejects if teardown command errors', async () => {
        const child = createFakeProcess(1);
        spawn.mockReturnValue(child);

        const result = create([teardown]).handle(commands).onFinish();
        child.emit('error', 'fail');
        await expect(result).rejects.toBeUndefined();
    });

    it('runs multiple teardown commands in sequence', async () => {
        const child1 = createFakeProcess(1);
        const child2 = createFakeProcess(2);
        spawn.mockReturnValueOnce(child1).mockReturnValueOnce(child2);

        const result = create(['foo', 'bar']).handle(commands).onFinish();

        expect(spawn).toHaveBeenCalledTimes(1);
        expect(spawn).toHaveBeenLastCalledWith('foo', getSpawnOpts({ stdio: 'raw' }));

        child1.emit('close', 1, null);
        await new Promise((resolve) => setTimeout(resolve));

        expect(spawn).toHaveBeenCalledTimes(2);
        expect(spawn).toHaveBeenLastCalledWith('bar', getSpawnOpts({ stdio: 'raw' }));

        child2.emit('close', 0, null);
        await expect(result).resolves.toBeUndefined();
    });

    it('stops running teardown commands on SIGINT', async () => {
        const child = createFakeProcess(1);
        spawn.mockReturnValue(child);

        const result = create(['foo', 'bar']).handle(commands).onFinish();
        child.emit('close', null, 'SIGINT');
        await result;

        expect(spawn).toHaveBeenCalledTimes(1);
        expect(spawn).toHaveBeenLastCalledWith('foo', expect.anything());
    });
});
