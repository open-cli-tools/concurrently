import { Command } from '../command';

export interface FlowController {
    handle(commands: Command[]): { commands: Command[], onFinish?: () => void };
}
