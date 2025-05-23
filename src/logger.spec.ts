import { subscribeSpyTo } from '@hirez_io/observer-spy';
import chalk from 'chalk';

import { FakeCommand } from './fixtures/fake-command';
import { Logger } from './logger';

beforeEach(() => {
    // Force chalk to use colors, otherwise tests may pass when they were supposed to be failing.
    chalk.level = 3;
});

const createLogger = (...options: ConstructorParameters<typeof Logger>) => {
    const logger = new Logger(...options);
    jest.spyOn(logger, 'log');
    const spy = subscribeSpyTo(logger.output);
    return { logger, spy };
};

describe('#log()', () => {
    it('emits prefix + text in the output stream', () => {
        const { logger, spy } = createLogger({});
        logger.log('foo', 'bar');

        const values = spy.getValues();
        expect(values).toHaveLength(2);
        expect(values[0]).toEqual({ command: undefined, text: 'foo' });
        expect(values[1]).toEqual({ command: undefined, text: 'bar' });
    });

    it('emits multiple lines of text with prefix on each', () => {
        const { logger, spy } = createLogger({});
        logger.log('foo', 'bar\nbaz\n');

        const values = spy.getValues();
        expect(values).toHaveLength(2);
        expect(values[0]).toEqual({ command: undefined, text: 'foo' });
        expect(values[1]).toEqual({ command: undefined, text: 'bar\nfoobaz\n' });
    });

    it('does not emit prefix if previous call from same command did not finish with a LF', () => {
        const { logger, spy } = createLogger({});
        const command = new FakeCommand();
        logger.log('foo', 'bar', command);
        logger.log('foo', 'baz', command);

        expect(spy.getValuesLength()).toBe(3);
        expect(spy.getLastValue()).toEqual({ command, text: 'baz' });
    });

    it('emits LF and prefix if previous call is from different command and did not finish with a LF', () => {
        const { logger, spy } = createLogger({});
        const command1 = new FakeCommand();
        logger.log('foo', 'bar', command1);

        const command2 = new FakeCommand();
        logger.log('foo', 'baz', command2);

        const values = spy.getValues();
        expect(values).toHaveLength(5);
        expect(values).toContainEqual({ command: command1, text: '\n' });
        expect(values).toContainEqual({ command: command2, text: 'foo' });
        expect(values).toContainEqual({ command: command2, text: 'baz' });
    });

    it('does not emit prefix nor handle text if logger is in raw mode', () => {
        const { logger, spy } = createLogger({ raw: true });
        logger.log('foo', 'bar\nbaz\n');

        const values = spy.getValues();
        expect(values).toHaveLength(1);
        expect(values[0]).toEqual({ command: undefined, text: 'bar\nbaz\n' });
    });
});

describe('#logGlobalEvent()', () => {
    it('does nothing if in raw mode', () => {
        const { logger } = createLogger({ raw: true });
        logger.logGlobalEvent('foo');

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('logs in gray dim style with arrow prefix', () => {
        const { logger } = createLogger({});
        logger.logGlobalEvent('foo');

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('foo') + '\n',
        );
    });
});

describe('#logCommandText()', () => {
    it('logs with name if no prefixFormat is set', () => {
        const { logger } = createLogger({});
        const cmd = new FakeCommand('bla');
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[bla]') + ' ', 'foo', cmd);
    });

    it('logs with index if no prefixFormat is set, and command has no name', () => {
        const { logger } = createLogger({});
        const cmd = new FakeCommand('', undefined, 2);
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[2]') + ' ', 'foo', cmd);
    });

    it('logs with prefixFormat set to pid', () => {
        const { logger } = createLogger({ prefixFormat: 'pid' });
        const cmd = new FakeCommand();
        cmd.pid = 123;
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[123]') + ' ', 'foo', cmd);
    });

    it('logs with prefixFormat set to name', () => {
        const { logger } = createLogger({ prefixFormat: 'name' });
        const cmd = new FakeCommand('bar');
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[bar]') + ' ', 'foo', cmd);
    });

    it('logs with prefixFormat set to index', () => {
        const { logger } = createLogger({ prefixFormat: 'index' });
        const cmd = new FakeCommand(undefined, undefined, 3);
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[3]') + ' ', 'foo', cmd);
    });

    it('logs with prefixFormat set to time (with timestampFormat)', () => {
        const { logger } = createLogger({ prefixFormat: 'time', timestampFormat: 'yyyy' });
        const cmd = new FakeCommand();
        logger.logCommandText('foo', cmd);

        const year = new Date().getFullYear();
        expect(logger.log).toHaveBeenCalledWith(chalk.reset(`[${year}]`) + ' ', 'foo', cmd);
    });

    it('logs with templated prefixFormat', () => {
        const { logger } = createLogger({ prefixFormat: '{index}-{name}' });
        const cmd = new FakeCommand('bar');
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('0-bar') + ' ', 'foo', cmd);
    });

    it('does not strip spaces from beginning or end of prefixFormat', () => {
        const { logger } = createLogger({ prefixFormat: ' {index}-{name} ' });
        const cmd = new FakeCommand('bar');
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset(' 0-bar ') + ' ', 'foo', cmd);
    });

    it('logs with no prefix', () => {
        const { logger } = createLogger({ prefixFormat: 'none' });
        const cmd = new FakeCommand();
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset(''), 'foo', cmd);
    });

    it('logs prefix using command line itself', () => {
        const { logger } = createLogger({ prefixFormat: 'command' });
        const cmd = new FakeCommand();
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[echo foo]') + ' ', 'foo', cmd);
    });

    it('logs prefix using command line itself, capped at commandLength bytes', () => {
        const { logger } = createLogger({ prefixFormat: 'command', commandLength: 6 });
        const cmd = new FakeCommand();
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[ec..oo]') + ' ', 'foo', cmd);
    });

    it('logs default prefixes with padding', () => {
        const { logger } = createLogger({});
        const cmd = new FakeCommand('foo');
        logger.setPrefixLength(5);
        logger.logCommandText('bar', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[foo  ]') + ' ', 'bar', cmd);
    });

    it('logs templated prefixes with padding', () => {
        const { logger } = createLogger({ prefixFormat: '{name}-{index}' });
        const cmd = new FakeCommand('foo', undefined, 0);
        logger.setPrefixLength(6);
        logger.logCommandText('bar', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('foo-0 ') + ' ', 'bar', cmd);
    });

    it('logs prefix using prefixColor from command', () => {
        const { logger } = createLogger({});
        const cmd = new FakeCommand('', undefined, 1, {
            prefixColor: 'blue',
        });
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.blue('[1]') + ' ', 'foo', cmd);
    });

    it('logs prefix in gray dim if prefixColor from command does not exist', () => {
        const { logger } = createLogger({});
        const cmd = new FakeCommand('', undefined, 1, {
            prefixColor: 'blue.fake',
        });
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.reset('[1]') + ' ', 'foo', cmd);
    });

    it('logs prefix using prefixColor from command if prefixColor is a hex value', () => {
        const { logger } = createLogger({});
        const prefixColor = '#32bd8a';
        const cmd = new FakeCommand('', undefined, 1, {
            prefixColor,
        });
        logger.logCommandText('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(chalk.hex(prefixColor)('[1]') + ' ', 'foo', cmd);
    });

    it('does nothing if command is hidden by name', () => {
        const { logger } = createLogger({ hide: ['abc'] });
        const cmd = new FakeCommand('abc');
        logger.logCommandText('foo', cmd);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does nothing if command is hidden by index', () => {
        const { logger } = createLogger({ hide: [3] });
        const cmd = new FakeCommand('', undefined, 3);
        logger.logCommandText('foo', cmd);

        expect(logger.log).not.toHaveBeenCalled();
    });
});

describe('#logCommandEvent()', () => {
    it('does nothing if in raw mode', () => {
        const { logger } = createLogger({ raw: true });
        logger.logCommandEvent('foo', new FakeCommand());

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does nothing if command is hidden by name', () => {
        const { logger } = createLogger({ hide: ['abc'] });
        const cmd = new FakeCommand('abc');
        logger.logCommandEvent('foo', cmd);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does nothing if command is hidden by index', () => {
        const { logger } = createLogger({ hide: [3] });
        const cmd = new FakeCommand('', undefined, 3);
        logger.logCommandEvent('foo', cmd);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('logs text in gray dim', () => {
        const { logger } = createLogger({});
        const cmd = new FakeCommand('', undefined, 1);
        logger.logCommandEvent('foo', cmd);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('[1]') + ' ',
            chalk.reset('foo') + '\n',
            cmd,
        );
    });

    it('prepends a LF if previous command write did not end with a LF', () => {
        const { logger } = createLogger({});
        const cmd = new FakeCommand('', undefined, 1);
        logger.logCommandText('text', cmd);
        logger.logCommandEvent('event', cmd);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('[1]') + ' ',
            '\n' + chalk.reset('event') + '\n',
            cmd,
        );
    });
});

describe('#logTable()', () => {
    it('does not log anything in raw mode', () => {
        const { logger } = createLogger({ raw: true });
        logger.logTable([{ foo: 1, bar: 2 }]);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does not log anything if value is not an array', () => {
        const { logger } = createLogger({});
        logger.logTable({} as never);
        logger.logTable(null as never);
        logger.logTable(0 as never);
        logger.logTable('' as never);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does not log anything if array is empty', () => {
        const { logger } = createLogger({});
        logger.logTable([]);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it('does not log anything if array items have no properties', () => {
        const { logger } = createLogger({});
        logger.logTable([{}]);

        expect(logger.log).not.toHaveBeenCalled();
    });

    it("logs a header for each item's properties", () => {
        const { logger } = createLogger({});
        logger.logTable([{ foo: 1, bar: 2 }]);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ foo │ bar │') + '\n',
        );
    });

    it("logs padded headers according to longest column's value", () => {
        const { logger } = createLogger({});
        logger.logTable([{ a: 'foo', b: 'barbaz' }]);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ a   │ b      │') + '\n',
        );
    });

    it("logs each items's values", () => {
        const { logger } = createLogger({});
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
        const { logger } = createLogger({});
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
        const { logger } = createLogger({});
        logger.logTable([{ foo: 1 }, { foo: 123 }]);

        expect(logger.log).toHaveBeenCalledWith(
            chalk.reset('-->') + ' ',
            chalk.reset('│ 1   │') + '\n',
        );
    });

    it('logs items with different properties in each', () => {
        const { logger } = createLogger({});
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

describe('#toggleColors()', () => {
    it('uses supported color level when on', () => {
        const { logger, spy } = createLogger({});
        logger.toggleColors(true);

        const command1 = new FakeCommand('foo', 'command', 0, { prefixColor: 'red' });
        logger.logCommandText('bar', command1);
        logger.logGlobalEvent('baz');

        const texts = spy.getValues().map((value) => value.text);
        expect(texts).toContain(chalk.red('[foo]') + ' ');
        expect(texts).toContain(chalk.reset('-->') + ' ');
    });

    it('uses no colors when off', () => {
        const { logger, spy } = createLogger({});
        logger.toggleColors(false);

        const command1 = new FakeCommand('foo', 'command', 0, { prefixColor: 'red' });
        logger.logCommandText('bar', command1);
        logger.logGlobalEvent('baz');

        const texts = spy.getValues().map((value) => value.text);
        expect(texts).toContain('[foo] ');
        expect(texts).toContain('--> ');
    });
});
