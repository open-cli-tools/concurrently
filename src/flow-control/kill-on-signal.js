const { of } = require('rxjs');

module.exports = class KillOnSignal {
    constructor({ process = global.process, scheduler }) {
        this.process = process;
        this.scheduler = scheduler;
    }

    handle(commands) {
        ['SIGINT', 'SIGTERM'].forEach(signal => {
            this.process.on(signal, () => {
                commands.forEach(command => command.kill(signal));
            });
        });

        return of(null, this.scheduler);
    }
};
