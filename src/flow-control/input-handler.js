const Rx = require('rxjs');
const { map } = require('rxjs/operators');

module.exports = class InputHandler {
    constructor({ defaultInputTarget, inputStream, logger }) {
        this.defaultInputTarget = defaultInputTarget;
        this.inputStream = inputStream;
        this.logger = logger;
    }

    handle(commands) {
        if (!this.inputStream) {
            return Rx.of(null);
        }

        Rx.fromEvent(this.inputStream, 'data')
            .pipe(map(data => data.toString()))
            .subscribe(data => {
                let [targetId, input] = data.split(':', 2); // eslint-disable-line prefer-const
                targetId = input ? targetId : this.defaultInputTarget;

                const command = commands.filter(command => (
                    command.name === targetId ||
                    command.index.toString() === targetId
                ));

                if (command && command.stdin) {
                    command.stdin.write(line);
                } else {
                    this.logger.logGlobalEvent(`Unable to find command ${targetId}\n`);
                }
            });

        return Rx.of(null);
    }
};
