const chalk = require('chalk');
const Logger = require('./logger');

beforeEach(() => {
    // Force chalk to use colours, otherwise tests may pass when they were supposed to be failing.
    chalk.level = 3;
});

const createLogger = options => {
    const logger = new Logger(Object.assign({}, options));
    jest.spyOn(logger, 'log');
    jest.spyOn(logger, 'emit');
    return logger;
};

describe('#log()', () => {
    it('writes prefix + text to the output stream', () => {
        const logger = createLogger({});
        logger.log('foo', 'bar', {});

        expect(logger.emit).toHaveBeenCalledTimes(2);
        expect(logger.emit).toHaveBeenCalledWith({}, 'foo');
        expect(logger.emit).toHaveBeenCalledWith({}, 'bar');
    });

    it('writes multiple lines of text with prefix on each', () => {
        const logger = createLogger({});
        logger.log('foo', 'bar\nbaz\n', {});

        expect(logger.emit).toHaveBeenCalledTimes(2);
        expect(logger.emit).toHaveBeenCalledWith({}, 'foo');
        expect(logger.emit).toHaveBeenCalledWith({}, 'bar\nfoobaz\n');
    });

    it('does not prepend prefix if last call did not finish with a LF', () => {
        const logger = createLogger({});
        logger.log('foo', 'bar', {});
        logger.emit.mockClear();
        logger.log('foo', 'baz', {});

        expect(logger.emit).toHaveBeenCalledTimes(1);
        expect(logger.emit).toHaveBeenCalledWith({}, 'baz');
    });

    it('does not prepend prefix or handle text if logger is in raw mode', () => {
        const logger = createLogger({ raw: true });
        logger.log('foo', 'bar\nbaz\n', {});

        expect(logger.emit).toHaveBeenCalledTimes(1);
        expect(logger.emit).toHaveBeenCalledWith({}, 'bar\nbaz\n');
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
            chalk.reset('-->') + ' ',
            chalk.reset('foo') + '\n',
            null
        );
    });
});

describe('#logCommandText()', () => {
    it('logs with name if no prefixFormat is set', () => {
        const logger = createLogger();
        const cmd = { name: 'bla' };
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[bla]') + ' ', 'foo', cmd);
    });

    it('logs with index if no prefixFormat is set, and command has no name', () => {
        const logger = createLogger();
        const cmd = { index: 2 };
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[2]') + ' ', 'foo', cmd);
    });

    it('logs with prefixFormat set to pid', () => {
        const logger = createLogger({ prefixFormat: 'pid' });
        const cmd = {
            pid: 123,
            info: {}
        };
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[123]') + ' ', 'foo', cmd);
    });

    it('logs with prefixFormat set to name', () => {
        const logger = createLogger({ prefixFormat: 'name' });
        const cmd = { name: 'bar' };
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[bar]') + ' ', 'foo', cmd);
    });

    it('logs with prefixFormat set to index', () => {
        const logger = createLogger({ prefixFormat: 'index' });
        const cmd = { index: 3 };
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[3]') + ' ', 'foo', cmd);
    });

    it('logs with prefixFormat set to time (with timestampFormat)', () => {
        const logger = createLogger({ prefixFormat: 'time', timestampFormat: 'yyyy' });
        logger.logCommandText('foo', {});

        const year = new Date().getFullYear();
        expect(logger.log).toHaveBeenCalledWith(chalk.reset(`[${year}]`) + ' ', 'foo', {});
    });

    it('logs with templated prefixFormat', () => {
        const logger = createLogger({ prefixFormat: '{index}-{name}' });
        const cmd = { index: 0, name: 'bar' };
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('0-bar') + ' ', 'foo', cmd);
    });

    it('does not strip spaces from beginning or end of prefixFormat', () => {
        const logger = createLogger({ prefixFormat: ' {index}-{name} ' });
        const cmd = { index: 0, name: 'bar' };
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset(' 0-bar ') + ' ', 'foo', cmd);
    });

    it('logs with no prefix', () => {
        const logger = createLogger({ prefixFormat: 'none' });
        const cmd = { command: 'echo foo' };
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset(''), 'foo', cmd);
    });

    it('logs prefix using command line itself', () => {
        const logger = createLogger({ prefixFormat: 'command' });
        const cmd = { command: 'echo foo' };
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[echo foo]') + ' ', 'foo', cmd);
    });

    it('logs prefix using command line itself, capped at prefixLength bytes', () => {
        const logger = createLogger({ prefixFormat: 'command', prefixLength: 6 });
        const cmd = { command: 'echo foo' };
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[ec..oo]') + ' ', 'foo', cmd);
    });

    it('logs prefix using prefixColor from command', () => {
        const logger = createLogger();
        const cmd = { prefixColor: 'blue', index: 1 };
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.blue('[1]') + ' ', 'foo', cmd);
    });

    it('logs prefix in gray dim if prefixColor from command does not exist', () => {
        const logger = createLogger();
        const cmd = { prefixColor: 'blue.fake', index: 1 };
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[1]') + ' ', 'foo', cmd);
    });

    it('logs prefix using prefixColor from command if prefixColor is a hex value', () => {
        const logger = createLogger();
        const prefixColor = '#32bd8a';
        const cmd = {prefixColor, index: 1};
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.hex(prefixColor)('[1]') + ' ', 'foo', cmd);
    });

    it('does nothing if command is hidden by name', () => {
        const logger = createLogger({ hide: ['abc'] });
        logger.logCommandText('foo', { name: 'abc' });

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does nothing if command is hidden by index', () => {
        const logger = createLogger({ hide: [3] });
        logger.logCommandText('foo', { index: 3 });

        expect(logger.log).not.toHaveBeenCalled();
    });
});

describe('#logCommandEvent()', () => {
    it('does nothing if in raw mode', () => {
        const logger = createLogger({ raw: true });
        logger.logCommandEvent('foo');

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does nothing if command is hidden by name', () => {
        const logger = createLogger({ hide: ['abc'] });
        logger.logCommandEvent('foo', { name: 'abc' });

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does nothing if command is hidden by index', () => {
        const logger = createLogger({ hide: [3] });
        logger.logCommandEvent('foo', { index: 3 });

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('logs text in gray dim', () => {
        const logger = createLogger();
        const cmd = { index: 1 };
        logger.logCommandEvent('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[1]') + ' ', chalk.reset('foo') + '\n', cmd);
    });
});

describe('#logTable()', () => {
    it('does not log anything in raw mode', () => {
        const logger = createLogger({ raw: true });
        logger.logTable([{ foo: 1, bar: 2 }]);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does not log anything if value is not an array', () => {
        const logger = createLogger();
        logger.logTable({});
        logger.logTable(null);
        logger.logTable(0);
        logger.logTable('');

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does not log anything if array is empy', () => {
        const logger = createLogger();
        logger.logTable([]);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does not log anything if array items have no properties', () => {
        const logger = createLogger();
        logger.logTable([{}]);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('logs a header for each item\'s properties', () => {
        const logger = createLogger();
        logger.logTable([{ foo: 1, bar: 2 }]);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ foo │ bar │') + '\n',
            null,
        );
    });

    it('logs padded headers according to longest column\'s value', () => {
        const logger = createLogger();
        logger.logTable([{ a: 'foo', b: 'barbaz' }]);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ a   │ b      │') + '\n',
            null,
        );
    });

    it('logs each items\'s values', () => {
        const logger = createLogger();
        logger.logTable([{ foo: 123 }, { foo: 456 }]);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ 123 │') + '\n',
            null,
        );
        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ 456 │') + '\n',
            null,
        );
    });

    it('logs each items\'s values padded according to longest column\'s value', () => {
        const logger = createLogger();
        logger.logTable([{ foo: 1 }, { foo: 123 }]);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ 1   │') + '\n',
            null,
        );
    });

    it('logs items with different properties in each', () => {
        const logger = createLogger();
        logger.logTable([{ foo: 1 }, { bar: 2 }]);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ foo │ bar │') + '\n',
            null,
        );
        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ 1   │     │') + '\n',
            null,
        );
        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│     │ 2   │') + '\n',
            null,
        );
    });
});
