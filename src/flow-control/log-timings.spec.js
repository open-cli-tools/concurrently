const { createMockInstance } = require('jest-create-mock-instance');
const Logger = require('../logger');
const LogTimings = require( './log-timings' );
const createFakeCommand = require('./fixtures/fake-command');

// shown in timing order
const startDate0 = new Date();
const startDate1 = new Date(startDate0.getTime() + 1000);
const endDate1 = new Date(startDate0.getTime() + 3000);
const endDate0 = new Date(startDate0.getTime() + 5000);

const getDurationText = (startDate, endDate) => (endDate.getTime() - startDate.getTime()).toLocaleString();
const command0DurationTextMs = getDurationText(startDate0, endDate0);
const command1DurationTextMs = getDurationText(startDate1, endDate1);

const exitInfoToTimingInfo = ({ command, timings, index, killed, exitCode }) => {
    const readableDurationMs = (timings.endDate - timings.startDate).toLocaleString();
    return {
        'call-index': index,
        name: command.name,
        duration: `~${readableDurationMs}ms`,
        'exit-code': exitCode,
        killed,
        command: command.command,
    };
};

let controller, logger, commands, command0ExitInfo, command1ExitInfo;

beforeEach(() => {
    commands = [
        createFakeCommand('foo', 'command 1', 0),
        createFakeCommand('bar', 'command 2', 1),
    ];

    command0ExitInfo = {
        command: commands[0].command,
        timings: {
            startDate: startDate0,
            endDate: endDate0,
        },
        index: commands[0].index,
        killed: false,
        exitCode: 0,
    };

    command1ExitInfo = {
        command: commands[1].command,
        timings: {
            startDate: startDate1,
            endDate: endDate1,
        },
        index: commands[1].index,
        killed: false,
        exitCode: 0,
    };

    logger = createMockInstance(Logger);
    controller = new LogTimings({ logger });
});

it('returns same commands', () => {
    expect(controller.handle(commands)).toMatchObject({ commands });
});

it('does not log timings and doesn\'t throw if no logger is provided', () => {
    controller = new LogTimings({  });
    controller.handle(commands);

    commands[0].timer.next({ startDate: startDate0 });
    commands[1].timer.next({ startDate: startDate1 });
    commands[1].timer.next({startDate: startDate1, endDate: endDate1 });
    commands[0].timer.next({startDate: startDate0, endDate: endDate0 });

    expect(logger.logCommandEvent).toHaveBeenCalledTimes(0);
});

it('logs the timings at the start and end (ie complete or error) event of each command', () => {
    controller.handle(commands);

    commands[0].timer.next({ startDate: startDate0 });
    commands[1].timer.next({ startDate: startDate1 });
    commands[1].timer.next({startDate: startDate1, endDate: endDate1 });
    commands[0].timer.next({startDate: startDate0, endDate: endDate0 });

    expect(logger.logCommandEvent).toHaveBeenCalledTimes(4);
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[0].command} started at ${startDate0.toLocaleString()}`,
        commands[0]
    );
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[1].command} started at ${startDate1.toLocaleString()}`,
        commands[1]
    );
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[1].command} stopped at ${endDate1.toLocaleString()} after ${command1DurationTextMs}ms`,
        commands[1]
    );
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[0].command} stopped at ${endDate0.toLocaleString()} after ${command0DurationTextMs}ms`,
        commands[0]
    );
});

it('does not log timings summary if there was an error', () => {
    jest.spyOn(console, 'table').mockImplementation(() => {});

    controller.handle(commands);

    commands[0].close.next(command0ExitInfo);
    commands[1].error.next();

    expect(console.table).toHaveBeenCalledTimes(0);

});

it('logs the sorted timings summary when all processes close successfully', () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'table').mockImplementation(() => {});
    jest.spyOn(controller, 'printExitInfoTimingTable');

    controller.handle(commands);

    commands[0].close.next(command0ExitInfo);
    commands[1].close.next(command1ExitInfo);

    expect(console.table).toHaveBeenCalledTimes(1);

    // un-sorted ie by finish order
    expect(controller.printExitInfoTimingTable).toHaveBeenCalledWith(
        [
            command0ExitInfo,
            command1ExitInfo
        ],
    );

    // sorted by duration
    expect(console.table).toHaveBeenCalledWith(
        [
            exitInfoToTimingInfo(command1ExitInfo),
            exitInfoToTimingInfo(command0ExitInfo),
        ],
    );

});
