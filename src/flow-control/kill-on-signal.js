module.exports = class KillOnSignal {
    constructor({ process = global.process } = {}) {
        this.process = process;
    }

    handle(commands) {
        ['SIGINT', 'SIGTERM'].forEach(signal => {
            this.process.on(signal, () => {
                commands.forEach(command => command.kill(signal));
            });
        });

        return commands;
    }
};
