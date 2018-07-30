module.exports = class LogExit {
    constructor(logger) {
        this.logger = logger;
    }

    handle(commands) {
        commands.forEach(command => command.close.subscribe(([exitCode, signal]) => {
            const code = exitCode == null ? signal : exitCode;
            this.logger.logCommandEvent(`${command.info.command} exited with code ${code}`, command);
        }));
    }
}
