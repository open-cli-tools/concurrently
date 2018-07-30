const chalk = require('chalk');
const _ = require('lodash');
const formatDate = require('date-fns/format');

module.exports = class Logger {
    constructor({ outputStream, prefixFormat, timestampFormat }) {
        this.outputStream = outputStream;
        this.prefixFormat = prefixFormat;
        this.timestampFormat = timestampFormat;
    }

    getPrefixesFor(command) {
        return {
            none: '',
            pid: command.process.pid,
            index: command.index,
            name: command.info.name,
            time: formatDate(Date.now(), this.timestampFormat)
        };
    }

    getPrefix(command) {
        const prefix = this.prefixFormat || (command.info.name ? 'name' : 'index');
        const prefixes = this.getPrefixesFor(command);
        if (Object.keys(prefixes).includes(prefix)) {
            return `[${prefixes[prefix]}]`;
        }

        return _.reduce(prefixes, (prev, val, key) => {
            const keyRegex = new RegExp(_.escapeRegExp(`{${key}}`), 'g');
            return prev.replace(keyRegex, val);
        }, prefix).trim();
    }

    colorText(command, text) {
        const color = _.get(chalk, command.prefixColor, chalk.gray.dim);
        return color(text);
    }

    logCommandEvent(text, command) {
        this.logCommandText(chalk.gray.dim(text) + '\n', command);
    }

    logCommandText(text, command) {
        const prefix = this.colorText(command, this.getPrefix(command)) + ' ';
        return this.log(prefix, text);
    }

    log(prefix, text) {
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
            this.outputStream.write(prefix);
        }

        this.lastChar = text[text.length - 1];
        this.outputStream.write(lines.join('\n'));
    }
}
