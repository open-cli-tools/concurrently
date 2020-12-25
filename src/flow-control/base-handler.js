module.exports = class BaseHandler {
    constructor(options = {}) {
        const { logger } = options;

        this.logger = logger;
    }

    handle(commands) {
        return commands;
    }

    /**
     * A hook called when all commands have finished (either successful or not).
     */
    onFinish() {}
};
