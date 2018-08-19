const { Writable } = require('stream');
const chalk = require('chalk');
const { createMockInstance } = require('jest-create-mock-instance');
const Logger = require('./logger');

let outputStream;
beforeEach(() => {
    outputStream = createMockInstance(Writable);
});

const createLogger = options => {
    const logger = new Logger(Object.assign({ outputStream }, options));
    jest.spyOn(logger, 'log');
    return logger;
};

describe('#log()', () => {
    it('writes prefix + text to the output stream', () => {
        const logger = new Logger({ outputStream });
        logger.log('foo', 'bar');

        expect(outputStream.write).toHaveBeenCalledTimes(2);
        expect(outputStream.write).toHaveBeenCalledWith('foo');
        expect(outputStream.write).toHaveBeenCalledWith('bar');
    });

    it('writes multiple lines of text with prefix on each', () => {
        const logger = new Logger({ outputStream });
        logger.log('foo', 'bar\nbaz\n');

        expect(outputStream.write).toHaveBeenCalledTimes(2);
        expect(outputStream.write).toHaveBeenCalledWith('foo');
        expect(outputStream.write).toHaveBeenCalledWith('bar\nfoobaz\n');
    });

    it('does not prepend prefix if last call did not finish with a LF', () => {
        const logger = new Logger({ outputStream });
        logger.log('foo', 'bar');
        outputStream.write.mockClear();
        logger.log('foo', 'baz');

        expect(outputStream.write).toHaveBeenCalledTimes(1);
        expect(outputStream.write).toHaveBeenCalledWith('baz');
    });

    it('does not prepend prefix or handle text if logger is in raw mode', () => {
        const logger = new Logger({ outputStream, raw: true });
        logger.log('foo', 'bar\nbaz\n');

        expect(outputStream.write).toHaveBeenCalledTimes(1);
        expect(outputStream.write).toHaveBeenCalledWith('bar\nbaz\n');
    });
});

describe('#logGlobalEvent()', () => {
    it('does nothing if in raw mode', () => {
        const logger = createLogger({ raw: true });
        logger.logGlobalEvent('foo');

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('logs in gray dim style with arrow prefix', () => {
        const logger = createLogger();
        logger.logGlobalEvent('foo');

        expect(logger.log).toHaveBeenCalledWith(
            chalk.gray.dim('-->') + ' ',
            chalk.gray.dim('foo') + '\n'
        );
    });
});

describe('#logCommandText()', () => {
    it('logs with name if no prefixFormat is set', () => {
        const logger = createLogger();
        logger.logCommandText('foo', { name: 'bla' });

        expect(logger.log).toHaveBeenCalledWith(chalk.gray.dim('[bla]') + ' ', 'foo');
    });

    it('logs with index if no prefixFormat is set, and command has no name', () => {
        const logger = createLogger();
        logger.logCommandText('foo', { index: 2 });

        expect(logger.log).toHaveBeenCalledWith(chalk.gray.dim('[2]') + ' ', 'foo');
    });

    it('logs with prefixFormat set to pid', () => {
        const logger = createLogger({ prefixFormat: 'pid' });
        logger.logCommandText('foo', {
            pid: 123,
            info: {}
        });

        expect(logger.log).toHaveBeenCalledWith(chalk.gray.dim('[123]') + ' ', 'foo');
    });

    it('logs with prefixFormat set to name', () => {
        const logger = createLogger({ prefixFormat: 'name' });
        logger.logCommandText('foo', { name: 'bar' });

        expect(logger.log).toHaveBeenCalledWith(chalk.gray.dim('[bar]') + ' ', 'foo');
    });

    it('logs with prefixFormat set to index', () => {
        const logger = createLogger({ prefixFormat: 'index' });
        logger.logCommandText('foo', { index: 3 });

        expect(logger.log).toHaveBeenCalledWith(chalk.gray.dim('[3]') + ' ', 'foo');
    });

    it('logs with prefixFormat set to time (with timestampFormat)', () => {
        const logger = createLogger({ prefixFormat: 'time', timestampFormat: 'YYYY' });
        logger.logCommandText('foo', {});

        const year = new Date().getFullYear();
        expect(logger.log).toHaveBeenCalledWith(chalk.gray.dim(`[${year}]`) + ' ', 'foo');
    });

    it('logs with templated prefixFormat', () => {
        const logger = createLogger({ prefixFormat: '{index}-{name}' });
        logger.logCommandText('foo', { index: 0, name: 'bar' });

        expect(logger.log).toHaveBeenCalledWith(chalk.gray.dim('0-bar') + ' ', 'foo');
    });

    it('logs with no prefix', () => {
        const logger = createLogger({ prefixFormat: 'none' });
        logger.logCommandText('foo', { command: 'echo foo' });

        expect(logger.log).toHaveBeenCalledWith(chalk.gray.dim(''), 'foo');
    });

    it('logs prefix using command line itself', () => {
        const logger = createLogger({ prefixFormat: 'command' });
        logger.logCommandText('foo', { command: 'echo foo' });

        expect(logger.log).toHaveBeenCalledWith(chalk.gray.dim('[echo foo]') + ' ', 'foo');
    });

    it('logs prefix using command line itself, capped at prefixLength bytes', () => {
        const logger = createLogger({ prefixFormat: 'command', prefixLength: 6 });
        logger.logCommandText('foo', { command: 'echo foo' });

        expect(logger.log).toHaveBeenCalledWith(chalk.gray.dim('[ec..oo]') + ' ', 'foo');
    });

    it('logs prefix using prefixColor from command', () => {
        const logger = createLogger();
        logger.logCommandText('foo', { prefixColor: 'blue', index: 1 });

        expect(logger.log).toHaveBeenCalledWith(chalk.blue('[1]') + ' ', 'foo');
    });

    it('logs prefix in gray dim if prefixColor from command does not exist', () => {
        const logger = createLogger();
        logger.logCommandText('foo', { prefixColor: 'blue.fake', index: 1 });

        expect(logger.log).toHaveBeenCalledWith(chalk.gray.dim('[1]') + ' ', 'foo');
    });
});

describe('#logCommandEvent()', () => {
    it('does nothing if in raw mode', () => {
        const logger = createLogger({ raw: true });
        logger.logCommandEvent('foo');

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('logs text in gray dim', () => {
        const logger = createLogger();
        logger.logCommandEvent('foo', { index: 1 });

        expect(logger.log).toHaveBeenCalledWith(chalk.gray.dim('[1]') + ' ', chalk.gray.dim('foo') + '\n');
    });
});
