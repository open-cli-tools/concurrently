import { createMockInstance } from "jest-create-mock-instance";
import { createFakeCloseEvent, FakeCommand } from "../fixtures/fake-command";
import { Logger } from "../logger";
import { LogExit } from "./log-exit";

let controller: LogExit;
let logger: Logger;
let commands: FakeCommand[];
beforeEach(() => {
    commands = [
        new FakeCommand(),
        new FakeCommand(),
    ];

    logger = createMockInstance(Logger);
    controller = new LogExit({ logger });
});

it('returns same commands', () => {
    expect(controller.handle(commands)).toMatchObject({ commands });
});

it('logs the close event of each command', () => {
    controller.handle(commands);

    commands[0].close.next(createFakeCloseEvent({ exitCode: 0 }));
    commands[1].close.next(createFakeCloseEvent({ exitCode: 'SIGTERM' }));

    expect(logger.logCommandEvent).toHaveBeenCalledTimes(2);
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[0].command} exited with code 0`,
        commands[0]
    );
    expect(logger.logCommandEvent).toHaveBeenCalledWith(
        `${commands[1].command} exited with code SIGTERM`,
        commands[1]
    );
});
