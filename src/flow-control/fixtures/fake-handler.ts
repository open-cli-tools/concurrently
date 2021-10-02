import * as BaseHandler from '../base-handler';

export class FakeHandler extends BaseHandler {
    constructor() {
        super();

        this.handle = jest.fn(commands => ({
            commands,
            onFinish: this.onFinish,
        }));
        this.onFinish = jest.fn();
    }
};
