import chalk from 'chalk';
import formatDate from 'date-fns/format';
import _ from 'lodash';
import * as Rx from 'rxjs';

import { Command, CommandIdentifier } from './command';
import * as defaults from './defaults';

export class Logger {
    private readonly hide: CommandIdentifier[];
    private readonly raw: boolean;
    private readonly prefixFormat?: string;
    private readonly prefixLength: number;
    private readonly timestampFormat: string;

    /**
     * Last character emitted.
     * If `undefined`, then nothing has been logged yet.
     */
    private lastChar?: string;

    /**
     * Observable that emits when there's been output logged.
     * If `command` is is `undefined`, then the log is for a global event.
     */
    readonly output = new Rx.Subject<{ command: Command | undefined; text: string }>();

    constructor({
        hide,
        prefixFormat,
        prefixLength,
        raw = false,
        timestampFormat,
    }: {
        /**
         * Which command(s) should have their output hidden.
         */
        hide?: CommandIdentifier | CommandIdentifier[];

        /**
         * Whether output should be formatted to include prefixes and whether "event" logs will be
         * logged.
         */
        raw?: boolean;

        /**
         * The prefix format to use when logging a command's output.
         * Defaults to the command's index.
         */
        prefixFormat?: string;

        /**
         * How many characters should a prefix have at most, used when the prefix format is `command`.
         */
        prefixLength?: number;

        /**
         * Date format used when logging date/time.
         * @see https://date-fns.org/v2.0.1/docs/format
         */
        timestampFormat?: string;
    }) {
        // To avoid empty strings from hiding the output of commands that don't have a name,
        // keep in the list of commands to hide only strings with some length.
        // This might happen through the CLI when no `--hide` argument is specified, for example.
        this.hide = _.castArray(hide)
            .filter((name) => name || name === 0)
            .map(String);
        this.raw = raw;
        this.prefixFormat = prefixFormat;
        this.prefixLength = prefixLength || defaults.prefixLength;
        this.timestampFormat = timestampFormat || defaults.timestampFormat;
    }

    private shortenText(text: string) {
        if (!text || text.length <= this.prefixLength) {
            return text;
        }

        const ellipsis = '..';
        const prefixLength = this.prefixLength - ellipsis.length;
        const endLength = Math.floor(prefixLength / 2);
        const beginningLength = prefixLength - endLength;

        const beginnning = text.slice(0, beginningLength);
        const end = text.slice(text.length - endLength, text.length);
        return beginnning + ellipsis + end;
    }

    private getPrefixesFor(command: Command): Record<string, string> {
        return {
            pid: String(command.pid),
            index: String(command.index),
            name: command.name,
            command: this.shortenText(command.command),
            time: formatDate(Date.now(), this.timestampFormat),
        };
    }

    getPrefix(command: Command) {
        const prefix = this.prefixFormat || (command.name ? 'name' : 'index');
        if (prefix === 'none') {
            return '';
        }

        const prefixes = this.getPrefixesFor(command);
        if (Object.keys(prefixes).includes(prefix)) {
            return `[${prefixes[prefix]}]`;
        }

        return _.reduce(
            prefixes,
            (prev, val, key) => {
                const keyRegex = new RegExp(_.escapeRegExp(`{${key}}`), 'g');
                return prev.replace(keyRegex, String(val));
            },
            prefix
        );
    }

    colorText(command: Command, text: string) {
        let color: chalk.Chalk;
        if (command.prefixColor && command.prefixColor.startsWith('#')) {
            color = chalk.hex(command.prefixColor);
        } else {
            const defaultColor = _.get(chalk, defaults.prefixColors, chalk.reset);
            color = _.get(chalk, command.prefixColor ?? '', defaultColor);
        }
        return color(text);
    }

    /**
     * Logs an event for a command (e.g. start, stop).
     *
     * If raw mode is on, then nothing is logged.
     */
    logCommandEvent(text: string, command: Command) {
        if (this.raw) {
            return;
        }

        this.logCommandText(chalk.reset(text) + '\n', command);
    }

    logCommandText(text: string, command: Command) {
        if (this.hide.includes(String(command.index)) || this.hide.includes(command.name)) {
            return;
        }

        const prefix = this.colorText(command, this.getPrefix(command));
        return this.log(prefix + (prefix ? ' ' : ''), text, command);
    }

    /**
     * Logs a global event (e.g. sending signals to processes).
     *
     * If raw mode is on, then nothing is logged.
     */
    logGlobalEvent(text: string) {
        if (this.raw) {
            return;
        }

        this.log(chalk.reset('-->') + ' ', chalk.reset(text) + '\n');
    }

    /**
     * Logs a table from an input object array, like `console.table`.
     *
     * Each row is a single input item, and they are presented in the input order.
     */
    logTable(tableContents: Record<string, unknown>[]) {
        // For now, can only print array tables with some content.
        if (this.raw || !Array.isArray(tableContents) || !tableContents.length) {
            return;
        }

        let nextColIndex = 0;
        const headers: Record<string, { index: number; length: number }> = {};
        const contentRows = tableContents.map((row) => {
            const rowContents: string[] = [];
            Object.keys(row).forEach((col) => {
                if (!headers[col]) {
                    headers[col] = {
                        index: nextColIndex++,
                        length: col.length,
                    };
                }

                const colIndex = headers[col].index;
                const formattedValue = String(row[col] == null ? '' : row[col]);
                // Update the column length in case this rows value is longer than the previous length for the column.
                headers[col].length = Math.max(formattedValue.length, headers[col].length);
                rowContents[colIndex] = formattedValue;
                return rowContents;
            });
            return rowContents;
        });

        const headersFormatted = Object.keys(headers).map((header) =>
            header.padEnd(headers[header].length, ' ')
        );

        if (!headersFormatted.length) {
            // No columns exist.
            return;
        }

        const borderRowFormatted = headersFormatted.map((header) => '─'.padEnd(header.length, '─'));

        this.logGlobalEvent(`┌─${borderRowFormatted.join('─┬─')}─┐`);
        this.logGlobalEvent(`│ ${headersFormatted.join(' │ ')} │`);
        this.logGlobalEvent(`├─${borderRowFormatted.join('─┼─')}─┤`);

        contentRows.forEach((contentRow) => {
            const contentRowFormatted = headersFormatted.map((header, colIndex) => {
                // If the table was expanded after this row was processed, it won't have this column.
                // Use an empty string in this case.
                const col = contentRow[colIndex] || '';
                return col.padEnd(header.length, ' ');
            });
            this.logGlobalEvent(`│ ${contentRowFormatted.join(' │ ')} │`);
        });

        this.logGlobalEvent(`└─${borderRowFormatted.join('─┴─')}─┘`);
    }

    log(prefix: string, text: string, command?: Command) {
        if (this.raw) {
            return this.emit(command, text);
        }

        // #70 - replace some ANSI code that would impact clearing lines
        text = text.replace(/\u2026/g, '...');

        const lines = text.split('\n').map((line, index, lines) => {
            // First line will write prefix only if we finished the last write with a LF.
            // Last line won't write prefix because it should be empty.
            if (index === 0 || index === lines.length - 1) {
                return line;
            }
            return prefix + line;
        });

        if (!this.lastChar || this.lastChar === '\n') {
            this.emit(command, prefix);
        }

        this.lastChar = text[text.length - 1];
        this.emit(command, lines.join('\n'));
    }

    emit(command: Command | undefined, text: string) {
        this.output.next({ command, text });
    }
}
