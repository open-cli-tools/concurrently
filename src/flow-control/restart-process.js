module.exports = class RestartProcess {
    constructor({ delay, tries, logger }) {
        this.delay = +delay || 0;
        this.tries = +tries || 0;
        this.logger = logger;
    }

    handle(commands) {
        if (this.tries === 0) {
            return;
        }

        commands.forEach(command => {
            command.close
                .filter(exitCode => exitCode !== 0)
                .take(this.tries)
                .delay(this.delay)
                .subscribe(() => {
                    this.logger.logCommandEvent(`${command.info.command} restarted`);
                    command.start();
                });
        });
    }
}
