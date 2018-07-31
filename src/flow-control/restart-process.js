const { filter, take, delay } = require('rxjs/operators');

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
                .pipe(filter(exitCode => typeof exitCode === 'number' && exitCode !== 0))
                .pipe(take(this.tries))
                .pipe(delay(this.delay))
                .subscribe(() => {
                    this.logger.logCommandEvent(`${command.info.command} restarted`, command);
                    command.start();
                });
        });
    }
}
