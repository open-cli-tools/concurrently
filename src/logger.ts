import chalk, { Chalk } from 'chalk';
import _ from 'lodash';
import * as Rx from 'rxjs';

import { Command, CommandIdentifier } from './command';
import { DateFormatter } from './date-format';
import * as defaults from './defaults';

const defaultChalk = chalk;
const noColorChalk = new chalk.Instance({ level: 0 });

export class Logger {
    private readonly hide: CommandIdentifier[];
    private readonly raw: boolean;
    private readonly prefixFormat?: string;
    private readonly commandLength: number;
    private readonly dateFormatter: DateFormatter;

    private chalk: Chalk = defaultChalk;

    /**
     * How many characters should a prefix have.
     * Prefixes shorter than this will be padded with spaces to the right.
     */
    private prefixLength = 0;

    /**
     * Last character emitted, and from which command.
     * If `undefined`, then nothing has been logged yet.
     */
    private lastWrite?: { command: Command | undefined; char: string };

    /**
     * Observable that emits when there's been output logged.
     * If `command` is is `undefined`, then the log is for a global event.
     */
    readonly output = new Rx.Subject<{ command: Command | undefined; text: string; id?: string }>();

    constructor({
        hide,
        prefixFormat,
        commandLength,
        raw = false,
        timestampFormat,
    }: {
        /**
         * Which commands should have their output hidden.
         */
        hide?: CommandIdentifier[];

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
         * How many characters should a prefix have at most when the format is `command`.
         */
        commandLength?: number;

        /**
         * Date format used when logging date/time.
         * @see https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
         */
        timestampFormat?: string;
    }) {
        this.hide = (hide || []).map(String);
        this.raw = raw;
        this.prefixFormat = prefixFormat;
        this.commandLength = commandLength || defaults.prefixLength;
        this.dateFormatter = new DateFormatter(timestampFormat || defaults.timestampFormat);
    }

    /**
     * Toggles colors on/off globally.
     */
    toggleColors(on: boolean) {
        this.chalk = on ? defaultChalk : noColorChalk;
    }

    private shortenText(text: string) {
        if (!text || text.length <= this.commandLength) {
            return text;
        }

        const ellipsis = '..';
        const prefixLength = this.commandLength - ellipsis.length;
        const endLength = Math.floor(prefixLength / 2);
        const beginningLength = prefixLength - endLength;

        const beginnning = text.slice(0, beginningLength);
        const end = text.slice(text.length - endLength, text.length);
        return beginnning + ellipsis + end;
    }

    private getPrefixesFor(command: Command): Record<string, string> {
        return {
            // When there's limited concurrency, the PID might not be immediately available,
            // so avoid the string 'undefined' from becoming a prefix
            pid: command.pid != null ? String(command.pid) : '',
            index: String(command.index),
            name: command.name,
            command: this.shortenText(command.command),
            time: this.dateFormatter.format(new Date()),
        };
    }

    getPrefixContent(
        command: Command,
    ): { type: 'default' | 'template'; value: string } | undefined {
        const prefix = this.prefixFormat || (command.name ? 'name' : 'index');
        if (prefix === 'none') {
            return;
        }

        const prefixes = this.getPrefixesFor(command);
        if (Object.keys(prefixes).includes(prefix)) {
            return { type: 'default', value: prefixes[prefix] };
        }

        const value = _.reduce(
            prefixes,
            (prev, val, key) => {
                const keyRegex = new RegExp(_.escapeRegExp(`{${key}}`), 'g');
                return prev.replace(keyRegex, String(val));
            },
            prefix,
        );
        return { type: 'template', value };
    }

    getPrefix(command: Command): string {
        const content = this.getPrefixContent(command);
        if (!content) {
            return '';
        }

        return content.type === 'template'
            ? content.value.padEnd(this.prefixLength, ' ')
            : `[${content.value.padEnd(this.prefixLength, ' ')}]`;
    }

    setPrefixLength(length: number) {
        this.prefixLength = length;
    }

    colorText(command: Command, text: string) {
        let color: chalk.Chalk;
        if (command.prefixColor && command.prefixColor.startsWith('#')) {
            color = this.chalk.hex(command.prefixColor);
        } else {
            const defaultColor = _.get(this.chalk, defaults.prefixColors, this.chalk.reset);
            color = _.get(this.chalk, command.prefixColor ?? '', defaultColor);
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

        // Last write was from this command, but it didn't end with a line feed.
        // Prepend one, otherwise the event's text will be concatenated to that write.
        // A line feed is otherwise inserted anyway.
        let prefix = '';
        if (this.lastWrite?.command === command && this.lastWrite.char !== '\n') {
            prefix = '\n';
        }
        this.logCommandText(prefix + this.chalk.reset(text) + '\n', command);
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

        this.log(this.chalk.reset('-->') + ' ', this.chalk.reset(text) + '\n');
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
            header.padEnd(headers[header].length, ' '),
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

    logAt(id: string, text: string) {
        if (!this.raw) {
            this.emit(undefined, text + '\n', id);
        }
    }

    log(prefix: string, text: string, command?: Command) {
        if (this.raw) {
            return this.emit(command, text);
        }

        // #70 - replace some ANSI code that would impact clearing lines
        text = text.replace(/\u2026/g, '...');

        // This write's interrupting another command, emit a line feed to start clean.
        if (this.lastWrite && this.lastWrite.command !== command && this.lastWrite.char !== '\n') {
            this.emit(this.lastWrite.command, '\n');
        }

        // Clean lines should emit a prefix
        if (!this.lastWrite || this.lastWrite.char === '\n') {
            this.emit(command, prefix);
        }

        const textToWrite = text.replaceAll('\n', (lf, i) => lf + (text[i + 1] ? prefix : ''));
        this.emit(command, textToWrite);
    }

    private emit(command: Command | undefined, text: string, id?: string) {
        this.lastWrite = { command, char: text[text.length - 1] };
        this.output.next({ command, text, id });
    }
}
