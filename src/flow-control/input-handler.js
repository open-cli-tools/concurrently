const Rx = require('rxjs');
const { map } = require('rxjs/operators');

module.exports = class InputHandler {
    constructor({ defaultInputTarget, inputStream, logger, scheduler }) {
        this.defaultInputTarget = defaultInputTarget;
        this.inputStream = inputStream;
        this.logger = logger;
        this.scheduler = scheduler;
    }

    handle(commands) {
        if (!this.inputStream) {
            return Rx.of(null, this.scheduler);
        }

        Rx.fromEvent(this.inputStream, 'data')
            .pipe(map(data => data.toString()))
            .subscribe(data => {
                let [targetId, input] = data.split(':', 2);
                targetId = input ? targetId : this.defaultInputTarget;
                input = input || data;

                const command = commands.find(command => (
                    command.name === targetId ||
                    command.index.toString() === targetId.toString()
                ));

                if (command && command.stdin) {
                    command.stdin.write(input);
                } else {
                    this.logger.logGlobalEvent(`Unable to find command ${targetId}, or it has no stdin open\n`);
                }
            });

        return Rx.of(null, this.scheduler);
    }
};
