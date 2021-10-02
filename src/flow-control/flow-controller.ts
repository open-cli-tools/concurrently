import { Command } from '../command';

export interface FlowController {
    handle(commands: Command[]): FlowControllerResult;
}


export interface FlowControllerResult {
    /**
     * Command instances with flow control updates made to them.
     */
    commands: Command[];

    /**
     * An optional callback to call when all commands have finished
     * (either successful or not)
     */
    onFinish?(): void;
}
