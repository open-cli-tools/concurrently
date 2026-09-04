import { Command } from '../command.js';
import { Logger } from '../logger.js';
import { FlowController } from './flow-controller.js';

/**
 * Logs the stdout and stderr output of commands.
 */
export class LogOutput implements FlowController {
    private readonly logger: Logger;
    private readonly hideEmptyLines: boolean;

    constructor({ logger, hideEmptyLines = false }: { logger: Logger; hideEmptyLines?: boolean }) {
        this.logger = logger;
        this.hideEmptyLines = hideEmptyLines;
    }

    handle(commands: Command[]) {
        commands.forEach((command) => {
            if (!this.hideEmptyLines) {
                command.stdout.subscribe((text) =>
                    this.logger.logCommandText(text.toString(), command),
                );
                command.stderr.subscribe((text) =>
                    this.logger.logCommandText(text.toString(), command),
                );
                return;
            }

            const stdoutFilter = new EmptyLineFilter();
            const stderrFilter = new EmptyLineFilter();
            const emit = (text: string) => {
                if (text) {
                    this.logger.logCommandText(text, command);
                }
            };
            const log = (filter: EmptyLineFilter, text: string) => emit(filter.write(text));

            command.stdout.subscribe((text) => log(stdoutFilter, text.toString()));
            command.stderr.subscribe((text) => log(stderrFilter, text.toString()));
            command.close.subscribe(() => {
                emit(stdoutFilter.flush());
                emit(stderrFilter.flush());
            });
        });

        return { commands };
    }
}

/**
 * Removes empty LF and CRLF lines while preserving all other output as it arrives.
 * A trailing CR is held until the next chunk so a split CRLF can be classified correctly.
 */
class EmptyLineFilter {
    private atLineStart = true;
    private pendingCarriageReturn = false;

    write(text: string) {
        let filtered = '';

        for (const char of text) {
            if (this.pendingCarriageReturn) {
                this.pendingCarriageReturn = false;
                if (char === '\n') {
                    if (!this.atLineStart) {
                        filtered += '\r\n';
                    }
                    this.atLineStart = true;
                    continue;
                }

                filtered += '\r';
                this.atLineStart = false;
            }

            if (char === '\r') {
                this.pendingCarriageReturn = true;
            } else if (char === '\n') {
                if (!this.atLineStart) {
                    filtered += char;
                }
                this.atLineStart = true;
            } else {
                filtered += char;
                this.atLineStart = false;
            }
        }

        return filtered;
    }

    flush() {
        const filtered = this.pendingCarriageReturn ? '\r' : '';
        this.pendingCarriageReturn = false;
        this.atLineStart = true;
        return filtered;
    }
}
