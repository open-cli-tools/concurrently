const { of } = require('rxjs');

module.exports = class LogExit {
    constructor(logger) {
        this.logger = logger;
    }

    handle(commands) {
        commands.forEach(command => command.close.subscribe(code => {
            this.logger.logCommandEvent(`${command.info.command} exited with code ${code}`, command);
        }));

        return of(null);
    }
}
