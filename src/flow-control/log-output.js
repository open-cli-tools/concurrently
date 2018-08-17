const { of } = require('rxjs');

module.exports = class LogOutput {
    constructor({ logger, scheduler }) {
        this.logger = logger;
        this.scheduler = scheduler;
    }

    handle(commands) {
        commands.forEach(command => {
            command.stdout.subscribe(text => this.logger.logCommandText(text.toString(), command));
            command.stderr.subscribe(text => this.logger.logCommandText(text.toString(), command));
        });

        return commands;
    }
};
