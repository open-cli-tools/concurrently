import { Command } from '../command.js';
import { Logger } from '../logger.js';
import { FlowController } from './flow-controller.js';

/**
 * Matches the escape sequences that commands use to clear the terminal:
 * - `ESC c`: full reset, used by e.g. `tsc --watch`;
 * - `ESC [ <n> J`: erase in display, e.g. `ESC [2J` (screen) and `ESC [3J` (scrollback);
 * - `ESC [ H`/`ESC [ f` with no or 0/1 coordinates: move the cursor to the top-left corner,
 *   which would make the next output overwrite what other commands logged.
 */
// eslint-disable-next-line no-control-regex
const CLEAR_SEQUENCE = /\x1bc|\x1b\[[0-3]?J|\x1b\[(?:[01]?(?:;[01]?)?)?[Hf]/g;

/**
 * Logs the stdout and stderr output of commands.
 */
export class LogOutput implements FlowController {
    private readonly logger: Logger;
    private readonly preventClear: boolean;

    constructor({ logger, preventClear = false }: { logger: Logger; preventClear?: boolean }) {
        this.logger = logger;
        this.preventClear = preventClear;
    }

    handle(commands: Command[]) {
        commands.forEach((command) => {
            command.stdout.subscribe((text) => this.log(text.toString(), command));
            command.stderr.subscribe((text) => this.log(text.toString(), command));
        });

        return { commands };
    }

    private log(text: string, command: Command) {
        if (!this.preventClear) {
            this.logger.logCommandText(text, command);
            return;
        }

        const output = text.replace(CLEAR_SEQUENCE, '');
        // Don't log chunks that only contained clear sequences, as that would output an empty prefix.
        if (output) {
            this.logger.logCommandText(output, command);
        }
    }
}
