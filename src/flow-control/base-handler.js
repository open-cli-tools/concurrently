module.exports = class BaseHandler {
    constructor(options = {}) {
        const { logger } = options;

        this.logger = logger;
    }

    handle(commands) {
        return commands;
    }
};
