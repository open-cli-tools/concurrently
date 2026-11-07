import { Command } from '../command.js';
import { Logger } from '../logger.js';
import { FlowController } from './flow-controller.js';

/**
 * Logs the stdout and stderr output of commands.
 */
export class LogOutput implements FlowController {
    private readonly logger: Logger;
    private readonly hideEmptyLines: boolean;

    constructor({ logger, hideEmptyLines }: { logger: Logger; hideEmptyLines?: boolean }) {
        this.logger = logger;
        this.hideEmptyLines = !!hideEmptyLines;
    }

    handle(commands: Command[]) {
        commands.forEach((command) => {
            [command.stdout, command.stderr].forEach((stream) => {
                if (!this.hideEmptyLines) {
                    stream.subscribe((text) =>
                        this.logger.logCommandText(text.toString(), command),
                    );
                    return;
                }

                const removeEmptyLines = createEmptyLineFilter();
                stream.subscribe((text) => {
                    const output = removeEmptyLines(text.toString());
                    if (output) {
                        this.logger.logCommandText(output, command);
                    }
                });
            });
        });

        return { commands };
    }
}

/**
 * Creates a function that removes empty and whitespace-only lines from the consecutive chunks of
 * a stream's text.
 *
 * A chunk might end in the middle of a line, so whitespace at the start of a line is held back
 * until the rest of the line shows whether it has any other content.
 */
function createEmptyLineFilter() {
    let heldWhitespace = '';
    let lineHasContent = false;

    return (text: string) => {
        let output = '';
        const lines = text.split('\n');
        lines.forEach((line, index) => {
            if (lineHasContent) {
                output += line;
            } else if (line.trim()) {
                output += heldWhitespace + line;
                heldWhitespace = '';
                lineHasContent = true;
            } else {
                heldWhitespace += line;
            }

            const endsLine = index < lines.length - 1;
            if (endsLine) {
                if (lineHasContent) {
                    output += '\n';
                }
                heldWhitespace = '';
                lineHasContent = false;
            }
        });
        return output;
    };
}
