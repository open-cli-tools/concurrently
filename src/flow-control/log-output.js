module.exports = class LogOutput {
    constructor(logger) {
        this.logger = logger;
    }

    handle(commands) {
        commands.forEach(command => {
            command.stdout.subscribe(text => this.logger.log(text.toString(), command));
            command.stderr.subscribe(text => this.logger.log(text.toString(), command));
        });
    }
}
