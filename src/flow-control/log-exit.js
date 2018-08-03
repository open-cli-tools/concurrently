const { of } = require('rxjs');

module.exports = class LogExit {
    constructor({ logger, scheduler }) {
        this.logger = logger;
        this.scheduler = scheduler;
    }

    handle(commands) {
        commands.forEach(command => command.close.subscribe(code => {
            this.logger.logCommandEvent(`${command.command} exited with code ${code}`, command);
        }));

        return of(null, this.scheduler);
    }
};
