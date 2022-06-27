import formatDate from 'date-fns/format';
import { createMockInstance } from 'jest-create-mock-instance';
import { CloseEvent } from '../command';
import { createFakeCloseEvent, FakeCommand } from '../fixtures/fake-command';
import { Logger } from '../logger';
import { LogTimings } from './log-timings';

// shown in timing order
const startDate0 = new Date();
const startDate1 = new Date(startDate0.getTime() + 1000);
const endDate1 = new Date(startDate0.getTime() + 5000);
const endDate0 = new Date(startDate0.getTime() + 3000);

const timestampFormat = 'yyyy-MM-dd HH:mm:ss.SSS';
const getDurationText = (startDate: Date, endDate: Date) =>
    `${(endDate.getTime() - startDate.getTime()).toLocaleString()}ms`;
const command0DurationTextMs = getDurationText(startDate0, endDate0);
const command1DurationTextMs = getDurationText(startDate1, endDate1);

let controller: LogTimings;
let logger: Logger;
let commands: FakeCommand[];
let command0ExitInfo: CloseEvent;
let command1ExitInfo: CloseEvent;

beforeEach(() => {
    commands = [new FakeCommand('foo', 'command 1', 0), new FakeCommand('bar', 'command 2', 1)];

    command0ExitInfo = createFakeCloseEvent({
        command: commands[0],
        timings: {
            startDate: startDate0,
            endDate: endDate0,
            durationSeconds: endDate0.getTime() - startDate0.getTime(),
        },
        index: commands[0].index,
    });

    command1ExitInfo = createFakeCloseEvent({
        command: commands[1],
        timings: {
            startDate: startDate1,
            endDate: endDate1,
            durationSeconds: endDate1.getTime() - startDate1.getTime(),
        },
        index: commands[1].index,
    });

    logger = createMockInstance(Logger);
    controller = new LogTimings({ logger, timestampFormat });
});

it('returns same commands', () => {
    expect(controller.handle(commands)).toMatchObject({ commands });
});

it("does not log timings and doesn't throw if no logger is provided", () => {
    controller = new LogTimings({});
    controller.handle(commands);

    commands[0].timer.next({ startDate: startDate0 });
    commands[1].timer.next({ startDate: startDate1 });
    commands[1].timer.next({ startDate: startDate1, endDate: endDate1 });
    commands[0].timer.next({ startDate: startDate0, endDate: endDate0 });

    expect(logger.logCommandEvent).toHaveBeenCalledTimes(0);
});

it('logs the timings at the start and end (ie complete or error) event of each command', () => {
    controller.handle(commands);

    commands[0].timer.next({ startDate: startDate0 });
    commands[1].timer.next({ startDate: startDate1 });
    commands[1].timer.next({ startDate: startDate1, endDate: endDate1 });
    commands[0].timer.next({ startDate: startDate0, endDate: endDate0 });

    expect(logger.logCommandEvent).toHaveBeenCalledTimes(4);
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[0].command} started at ${formatDate(startDate0, timestampFormat)}`,
        commands[0]
    );
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[1].command} started at ${formatDate(startDate1, timestampFormat)}`,
        commands[1]
    );
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[1].command} stopped at ${formatDate(
            endDate1,
            timestampFormat
        )} after ${command1DurationTextMs}`,
        commands[1]
    );
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[0].command} stopped at ${formatDate(
            endDate0,
            timestampFormat
        )} after ${command0DurationTextMs}`,
        commands[0]
    );
});

it('does not log timings summary if there was an error', () => {
    controller.handle(commands);

    commands[0].close.next(command0ExitInfo);
    commands[1].error.next(undefined);

    expect(logger.logTable).toHaveBeenCalledTimes(0);
});

it('logs the sorted timings summary when all processes close successfully', () => {
    controller.handle(commands);

    commands[0].close.next(command0ExitInfo);
    commands[1].close.next(command1ExitInfo);

    expect(logger.logGlobalEvent).toHaveBeenCalledTimes(1);
    expect(logger.logGlobalEvent).toHaveBeenCalledWith('Timings:');
    expect(logger.logTable).toHaveBeenCalledTimes(1);
    // sorted by duration
    expect(logger.logTable).toHaveBeenCalledWith([
        LogTimings.mapCloseEventToTimingInfo(command1ExitInfo),
        LogTimings.mapCloseEventToTimingInfo(command0ExitInfo),
    ]);
});
