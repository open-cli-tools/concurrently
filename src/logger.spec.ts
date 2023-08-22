import chalk from 'chalk';

import { FakeCommand } from './fixtures/fake-command';
import { Logger } from './logger';

let emitSpy: jest.SpyInstance;

beforeEach(() => {
    // Force chalk to use colors, otherwise tests may pass when they were supposed to be failing.
    chalk.level = 3;
});

const createLogger = (...options: ConstructorParameters<typeof Logger>) => {
    const logger = new Logger(...options);
    jest.spyOn(logger, 'log');
    emitSpy = jest.spyOn(logger, 'emit');
    return logger;
};

describe('#log()', () => {
    it('writes prefix + text to the output stream', () => {
        const logger = createLogger({});
        logger.log('foo', 'bar');

        expect(logger.emit).toHaveBeenCalledTimes(2);
        expect(logger.emit).toHaveBeenCalledWith(undefined, 'foo');
        expect(logger.emit).toHaveBeenCalledWith(undefined, 'bar');
    });

    it('writes multiple lines of text with prefix on each', () => {
        const logger = createLogger({});
        logger.log('foo', 'bar\nbaz\n');

        expect(logger.emit).toHaveBeenCalledTimes(2);
        expect(logger.emit).toHaveBeenCalledWith(undefined, 'foo');
        expect(logger.emit).toHaveBeenCalledWith(undefined, 'bar\nfoobaz\n');
    });

    it('does not prepend prefix if last call did not finish with a LF', () => {
        const logger = createLogger({});
        logger.log('foo', 'bar');
        emitSpy.mockClear();
        logger.log('foo', 'baz');

        expect(logger.emit).toHaveBeenCalledTimes(1);
        expect(logger.emit).toHaveBeenCalledWith(undefined, 'baz');
    });

    it('does not prepend prefix or handle text if logger is in raw mode', () => {
        const logger = createLogger({ raw: true });
        logger.log('foo', 'bar\nbaz\n');

        expect(logger.emit).toHaveBeenCalledTimes(1);
        expect(logger.emit).toHaveBeenCalledWith(undefined, 'bar\nbaz\n');
    });
});

describe('#logGlobalEvent()', () => {
    it('does nothing if in raw mode', () => {
        const logger = createLogger({ raw: true });
        logger.logGlobalEvent('foo');

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('logs in gray dim style with arrow prefix', () => {
        const logger = createLogger({});
        logger.logGlobalEvent('foo');

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('foo') + '\n',
        );
    });
});

describe('#logCommandText()', () => {
    it('logs with name if no prefixFormat is set', () => {
        const logger = createLogger({});
        const cmd = new FakeCommand('bla');
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[bla]') + ' ', 'foo', cmd);
    });

    it('logs with index if no prefixFormat is set, and command has no name', () => {
        const logger = createLogger({});
        const cmd = new FakeCommand('', undefined, 2);
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[2]') + ' ', 'foo', cmd);
    });

    it('logs with prefixFormat set to pid', () => {
        const logger = createLogger({ prefixFormat: 'pid' });
        const cmd = new FakeCommand();
        cmd.pid = 123;
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[123]') + ' ', 'foo', cmd);
    });

    it('logs with prefixFormat set to name', () => {
        const logger = createLogger({ prefixFormat: 'name' });
        const cmd = new FakeCommand('bar');
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[bar]') + ' ', 'foo', cmd);
    });

    it('logs with prefixFormat set to index', () => {
        const logger = createLogger({ prefixFormat: 'index' });
        const cmd = new FakeCommand(undefined, undefined, 3);
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[3]') + ' ', 'foo', cmd);
    });

    it('logs with prefixFormat set to time (with timestampFormat)', () => {
        const logger = createLogger({ prefixFormat: 'time', timestampFormat: 'yyyy' });
        const cmd = new FakeCommand();
        logger.logCommandText('foo', cmd);

        const year = new Date().getFullYear();
        expect(logger.log).toHaveBeenCalledWith(chalk.reset(`[${year}]`) + ' ', 'foo', cmd);
    });

    it('logs with templated prefixFormat', () => {
        const logger = createLogger({ prefixFormat: '{index}-{name}' });
        const cmd = new FakeCommand('bar');
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('0-bar') + ' ', 'foo', cmd);
    });

    it('does not strip spaces from beginning or end of prefixFormat', () => {
        const logger = createLogger({ prefixFormat: ' {index}-{name} ' });
        const cmd = new FakeCommand('bar');
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset(' 0-bar ') + ' ', 'foo', cmd);
    });

    it('logs with no prefix', () => {
        const logger = createLogger({ prefixFormat: 'none' });
        const cmd = new FakeCommand();
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset(''), 'foo', cmd);
    });

    it('logs prefix using command line itself', () => {
        const logger = createLogger({ prefixFormat: 'command' });
        const cmd = new FakeCommand();
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[echo foo]') + ' ', 'foo', cmd);
    });

    it('logs prefix using command line itself, capped at prefixLength bytes', () => {
        const logger = createLogger({ prefixFormat: 'command', prefixLength: 6 });
        const cmd = new FakeCommand();
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[ec..oo]') + ' ', 'foo', cmd);
    });

    it('logs prefix using prefixColor from command', () => {
        const logger = createLogger({});
        const cmd = new FakeCommand('', undefined, 1, {
            prefixColor: 'blue',
        });
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.blue('[1]') + ' ', 'foo', cmd);
    });

    it('logs prefix in gray dim if prefixColor from command does not exist', () => {
        const logger = createLogger({});
        const cmd = new FakeCommand('', undefined, 1, {
            prefixColor: 'blue.fake',
        });
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[1]') + ' ', 'foo', cmd);
    });

    it('logs prefix using prefixColor from command if prefixColor is a hex value', () => {
        const logger = createLogger({});
        const prefixColor = '#32bd8a';
        const cmd = new FakeCommand('', undefined, 1, {
            prefixColor,
        });
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.hex(prefixColor)('[1]') + ' ', 'foo', cmd);
    });

    it('does nothing if command is hidden by name', () => {
        const logger = createLogger({ hide: ['abc'] });
        const cmd = new FakeCommand('abc');
        logger.logCommandText('foo', cmd);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does nothing if command is hidden by index', () => {
        const logger = createLogger({ hide: [3] });
        const cmd = new FakeCommand('', undefined, 3);
        logger.logCommandText('foo', cmd);

        expect(logger.log).not.toHaveBeenCalled();
    });
});

describe('#logCommandEvent()', () => {
    it('does nothing if in raw mode', () => {
        const logger = createLogger({ raw: true });
        logger.logCommandEvent('foo', new FakeCommand());

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does nothing if command is hidden by name', () => {
        const logger = createLogger({ hide: ['abc'] });
        const cmd = new FakeCommand('abc');
        logger.logCommandEvent('foo', cmd);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does nothing if command is hidden by index', () => {
        const logger = createLogger({ hide: [3] });
        const cmd = new FakeCommand('', undefined, 3);
        logger.logCommandEvent('foo', cmd);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('logs text in gray dim', () => {
        const logger = createLogger({});
        const cmd = new FakeCommand('', undefined, 1);
        logger.logCommandEvent('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('[1]') + ' ',
            chalk.reset('foo') + '\n',
            cmd,
        );
    });
});

describe('#logTable()', () => {
    it('does not log anything in raw mode', () => {
        const logger = createLogger({ raw: true });
        logger.logTable([{ foo: 1, bar: 2 }]);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does not log anything if value is not an array', () => {
        const logger = createLogger({});
        logger.logTable({} as never);
        logger.logTable(null as never);
        logger.logTable(0 as never);
        logger.logTable('' as never);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does not log anything if array is empy', () => {
        const logger = createLogger({});
        logger.logTable([]);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does not log anything if array items have no properties', () => {
        const logger = createLogger({});
        logger.logTable([{}]);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it("logs a header for each item's properties", () => {
        const logger = createLogger({});
        logger.logTable([{ foo: 1, bar: 2 }]);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ foo │ bar │') + '\n',
        );
    });

    it("logs padded headers according to longest column's value", () => {
        const logger = createLogger({});
        logger.logTable([{ a: 'foo', b: 'barbaz' }]);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ a   │ b      │') + '\n',
        );
    });

    it("logs each items's values", () => {
        const logger = createLogger({});
        logger.logTable([{ foo: 123 }, { foo: 456 }]);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ 123 │') + '\n',
        );
        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ 456 │') + '\n',
        );
    });

    it("logs each items's values with empty column", () => {
        const logger = createLogger({});
        logger.logTable([{ foo: 123 }, { foo: null }]);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ 123 │') + '\n',
        );
        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│     │') + '\n',
        );
    });

    it("logs each items's values padded according to longest column's value", () => {
        const logger = createLogger({});
        logger.logTable([{ foo: 1 }, { foo: 123 }]);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ 1   │') + '\n',
        );
    });

    it('logs items with different properties in each', () => {
        const logger = createLogger({});
        logger.logTable([{ foo: 1 }, { bar: 2 }]);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ foo │ bar │') + '\n',
        );
        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ 1   │     │') + '\n',
        );
        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│     │ 2   │') + '\n',
        );
    });
});
