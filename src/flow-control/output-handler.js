module.exports = class OutputHandler {
    constructor(logger) {
        this.logger = logger;
    }

    handle(commands) {
        commands.forEach(command => command.on('start', () => {
            command.stdout && command.stdout.subscribe(text => this.logger.log(text.toString(), command));
            command.stderr && command.stderr.subscribe(text => this.logger.log(text.toString(), command));
        }));
    }
}
