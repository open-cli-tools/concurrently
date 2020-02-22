const { map } = require('rxjs/operators');


module.exports = class KillOnSignal {
    constructor({ process }) {
        this.process = process;
    }

    handle(commands) {
        let caughtSignal;
        ['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(signal => {
            this.process.on(signal, () => {
                caughtSignal = signal;
                commands.forEach(command => command.kill(signal));
            });
        });

        return commands.map(command => {
            const closeStream = command.close.pipe(map(value => {
                return caughtSignal === 'SIGINT' ? 0 : value;
            }));
            return new Proxy(command, {
                get(target, prop) {
                    return prop === 'close' ? closeStream : target[prop];
                }
            });
        });
    }
};
