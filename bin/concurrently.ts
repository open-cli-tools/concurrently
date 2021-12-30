#!/usr/bin/env node
import yargs from 'yargs';
import * as defaults from '../src/defaults';
import concurrently from '../index';
import { epilogue } from './epilogue';

const args = yargs
    .usage('$0 [options] <command ...>')
    .help('h')
    .alias('h', 'help')
    .version()
    .alias('version', 'v')
    .alias('version', 'V')
    // TODO: Add some tests for this.
    .env('CONCURRENTLY')
    .options({
        // General
        'max-processes': {
            alias: 'm',
            describe:
                'How many processes should run at once.\n' +
                'New processes only spawn after all restart tries of a process.',
            type: 'number'
        },
        'names': {
            alias: 'n',
            describe:
                'List of custom names to be used in prefix template.\n' +
                'Example names: "main,browser,server"',
            type: 'string'
        },
        'name-separator': {
            describe:
                'The character to split <names> on. Example usage:\n' +
                'concurrently -n "styles|scripts|server" --name-separator "|"',
            default: defaults.nameSeparator,
        },
        'success': {
            alias: 's',
            describe:
                'Return exit code of zero or one based on the success or failure ' +
                'of the "first" child to terminate, the "last child", or succeed ' +
                'only if "all" child processes succeed.',
            choices: ['first', 'last', 'all'] as const,
            default: defaults.success
        },
        'raw': {
            alias: 'r',
            describe:
                'Output only raw output of processes, disables prettifying ' +
                'and concurrently coloring.',
            type: 'boolean'
        },
        // This one is provided for free. Chalk reads this itself and removes colours.
        // https://www.npmjs.com/package/chalk#chalksupportscolor
        'no-color': {
            describe: 'Disables colors from logging',
            type: 'boolean'
        },
        'hide': {
            describe:
                'Comma-separated list of processes to hide the output.\n' +
                'The processes can be identified by their name or index.',
            default: defaults.hide,
            type: 'string'
        },
        'group': {
            alias: 'g',
            describe: 'Order the output as if the commands were run sequentially.',
            type: 'boolean'
        },
        'timings': {
            describe: 'Show timing information for all processes',
            type: 'boolean',
            default: defaults.timings
        },

        // Kill others
        'kill-others': {
            alias: 'k',
            describe: 'kill other processes if one exits or dies',
            type: 'boolean'
        },
        'kill-others-on-fail': {
            describe: 'kill other processes if one exits with non zero status code',
            type: 'boolean'
        },

        // Prefix
        'prefix': {
            alias: 'p',
            describe:
                'Prefix used in logging for each process.\n' +
                'Possible values: index, pid, time, command, name, none, or a template. ' +
                'Example template: "{time}-{pid}"',
            defaultDescription: 'index or name (when --names is set)',
            type: 'string'
        },
        'prefix-colors': {
            alias: 'c',
            describe:
                'Comma-separated list of chalk colors to use on prefixes. ' +
                'If there are more commands than colors, the last color will be repeated.\n' +
                '- Available modifiers: reset, bold, dim, italic, underline, inverse, hidden, strikethrough\n' +
                '- Available colors: black, red, green, yellow, blue, magenta, cyan, white, gray \n' +
                'or any hex values for colors, eg #23de43\n' +
                '- Available background colors: bgBlack, bgRed, bgGreen, bgYellow, bgBlue, bgMagenta, bgCyan, bgWhite\n' +
                'See https://www.npmjs.com/package/chalk for more information.',
            default: defaults.prefixColors,
            type: 'string'
        },
        'prefix-length': {
            alias: 'l',
            describe:
                'Limit how many characters of the command is displayed in prefix. ' +
                'The option can be used to shorten the prefix when it is set to "command"',
            default: defaults.prefixLength,
            type: 'number'
        },
        'timestamp-format': {
            alias: 't',
            describe: 'Specify the timestamp in moment/date-fns format.',
            default: defaults.timestampFormat,
            type: 'string'
        },

        // Restarting
        'restart-tries': {
            describe:
                'How many times a process that died should restart.\n' +
                'Negative numbers will make the process restart forever.',
            default: defaults.restartTries,
            type: 'number'
        },
        'restart-after': {
            describe: 'Delay time to respawn the process, in milliseconds.',
            default: defaults.restartDelay,
            type: 'number'
        },

        // Input
        'handle-input': {
            alias: 'i',
            describe:
                'Whether input should be forwarded to the child processes. ' +
                'See examples for more information.',
            type: 'boolean'
        },
        'default-input-target': {
            default: defaults.defaultInputTarget,
            describe:
                'Identifier for child process to which input on stdin ' +
                'should be sent if not specified at start of input.\n' +
                'Can be either the index or the name of the process.'
        }
    })
    .group(['m', 'n', 'name-separator', 'raw', 's', 'no-color', 'hide', 'group', 'timings'], 'General')
    .group(['p', 'c', 'l', 't'], 'Prefix styling')
    .group(['i', 'default-input-target'], 'Input handling')
    .group(['k', 'kill-others-on-fail'], 'Killing other processes')
    .group(['restart-tries', 'restart-after'], 'Restarting')
    .epilogue(epilogue)
    .argv;

const names = (args.names || '').split(args['name-separator']);

concurrently(args._.map((command, index) => ({
    command: String(command),
    name: names[index]
})), {
    handleInput: args['handle-input'],
    defaultInputTarget: args['default-input-target'],
    killOthers: args.killOthers
        ? ['success', 'failure']
        : (args.killOthersOnFail ? ['failure'] : []),
    maxProcesses: args['max-processes'],
    raw: args.raw,
    hide: args.hide.split(','),
    group: args.group,
    prefix: args.prefix,
    prefixColors: args['prefix-colors'].split(','),
    prefixLength: args['prefix-length'],
    restartDelay: args['restart-after'],
    restartTries: args['restart-tries'],
    successCondition: args.success,
    timestampFormat: args['timestamp-format'],
    timings: args.timings
}).then(
    () => process.exit(0),
    () => process.exit(1)
);
