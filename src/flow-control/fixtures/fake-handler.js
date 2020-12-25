const BaseHandler = require('../base-handler')

module.exports = class FakeHandler extends BaseHandler {
    constructor() {
        super();

        this.handle = jest.fn(commands => commands);
    }
};
