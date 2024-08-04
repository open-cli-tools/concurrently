import createMockInstance from 'jest-create-mock-instance';

import { FakeCommand } from '../fixtures/fake-command';
import { Logger } from '../logger';
import { LoggerPadding } from './logger-padding';

let logger: jest.Mocked<Logger>;
let controller: LoggerPadding;
let commands: FakeCommand[];

beforeEach(() => {
    commands = [new FakeCommand(), new FakeCommand()];
    logger = createMockInstance(Logger);
    controller = new LoggerPadding({ logger });
});

it('returns same commands', () => {
    expect(controller.handle(commands)).toMatchObject({ commands });
});

it('sets the prefix length when commands emit a start timer', () => {
    controller.handle(commands);
    expect(logger.setPrefixLength).toHaveBeenCalledTimes(0);

    commands[0].timer.next({ startDate: new Date() });
    expect(logger.setPrefixLength).toHaveBeenCalledTimes(1);

    commands[1].timer.next({ startDate: new Date() });
    expect(logger.setPrefixLength).toHaveBeenCalledTimes(2);
});

it('sets prefix length to the longest prefix of all commands', () => {
    logger.getPrefixContent
        .mockReturnValueOnce({ type: 'default', value: 'foobar' })
        .mockReturnValueOnce({ type: 'default', value: 'baz' });

    controller.handle(commands);
    commands.forEach((command) => command.timer.next({ startDate: new Date() }));

    expect(logger.setPrefixLength).toHaveBeenCalledWith(6);
});

it('does not shorten the prefix length', () => {
    logger.getPrefixContent
        .mockReturnValueOnce({ type: 'default', value: '100' })
        .mockReturnValueOnce({ type: 'default', value: '1' });

    controller.handle(commands);
    commands[0].timer.next({ startDate: new Date() });
    expect(logger.setPrefixLength).toHaveBeenCalledWith(3);

    commands[0].timer.next({ startDate: new Date() });
    expect(logger.setPrefixLength).toHaveBeenCalledWith(3);
});

it('unsubscribes from start timers on finish', () => {
    logger.getPrefixContent.mockReturnValue({ type: 'default', value: '1' });

    const { onFinish } = controller.handle(commands);
    commands[0].timer.next({ startDate: new Date() });

    onFinish();
    commands[0].timer.next({ startDate: new Date() });
    expect(logger.setPrefixLength).toHaveBeenCalledTimes(1);
});
