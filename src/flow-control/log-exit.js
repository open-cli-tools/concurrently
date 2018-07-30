module.exports = class LogExit {
    constructor(logger) {
        this.logger = logger;
    }

    handle(commands) {
        commands.forEach(command => command.close.subscribe(exitCode => {
            this.logger.logEvent(`${command.info.command} exited with code ${exitCode}`, command);
        }));
    }
}
