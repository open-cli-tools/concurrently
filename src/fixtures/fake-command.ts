import { createMockInstance } from "jest-create-mock-instance";
import { Writable } from "stream";
import { CloseEvent, Command, CommandInfo } from "../command";

export class FakeCommand extends Command {
    // Type-safe workaround for setting `killable` to a custom value.
    isKillable = false;
    get killable() {
        return this.isKillable;
    }

    constructor(name = 'foo', command = 'echo foo', index = 0, info?: Partial<CommandInfo>) {
        super({
            index,
            name,
            command,
            ...info,
        }, {}, jest.fn(), jest.fn());

        this.stdin = createMockInstance(Writable);
        this.start = jest.fn();
        this.kill = jest.fn();
    }
}

export const createFakeCloseEvent = (overrides?: Partial<CloseEvent>): CloseEvent => ({
    command: new FakeCommand(),
    index: 0,
    killed: false,
    exitCode: 0,
    timings: {
        startDate: new Date(),
        endDate: new Date(),
        durationSeconds: 0,
    },
    ...overrides,
});
