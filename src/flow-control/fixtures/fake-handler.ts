import { FlowController } from '../flow-controller';

export class FakeHandler implements FlowController {
    readonly onFinish = jest.fn();
    readonly handle = jest.fn(commands => ({
        commands,
        onFinish: this.onFinish,
    }));
};
