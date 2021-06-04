#!/usr/bin/env node
const fs = require('fs');
const yargs = require('yargs');
const defaults = require('../src/defaults');
const concurrently = require('../index');

const args = yargs
    .usage('$0 [options] <command ...>')
    .help('h')
    .alias('h', 'help')
    .version('v', require('../package.json').version)
    .alias('v', 'V')
    .alias('v', 'version')
    .options({
        // General
        'm': {
            alias: 'max-processes',
            describe:
                'How many processes should run at once.\n' +
                'New processes only spawn after all restart tries of a process.',
            type: 'number'
        },
        'n': {
            alias: 'names',
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
        's': {
            alias: 'success',
            describe:
                'Return exit code of zero or one based on the success or failure ' +
                'of the "first" child to terminate, the "last child", or succeed ' +
                'only if "all" child processes succeed.',
            choices: ['first', 'last', 'all'],
            default: defaults.success
        },
        'r': {
            alias: 'raw',
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

        // Kill others
        'k': {
            alias: 'kill-others',
            describe: 'kill other processes if one exits or dies',
            type: 'boolean'
        },
        'kill-others-on-fail': {
            describe: 'kill other processes if one exits with non zero status code',
            type: 'boolean'
        },

        // Prefix
        'p': {
            alias: 'prefix',
            describe:
                'Prefix used in logging for each process.\n' +
                'Possible values: index, pid, time, command, name, none, or a template. ' +
                'Example template: "{time}-{pid}"',
            defaultDescription: 'index or name (when --names is set)',
            type: 'string'
        },
        'c': {
            alias: 'prefix-colors',
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
        'l': {
            alias: 'prefix-length',
            describe:
                'Limit how many characters of the command is displayed in prefix. ' +
                'The option can be used to shorten the prefix when it is set to "command"',
            default: defaults.prefixLength,
            type: 'number'
        },
        't': {
            alias: 'timestamp-format',
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
        'i': {
            alias: 'handle-input',
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
        },

        // shorten command
        'P': {
            alias: 'prepend',
            describe: 
                'prepend string to each command\n' +
                'but make sure you not using dash, else use \n' +
                '`-D prepend="foobar"`',
            default: '',
            type: 'string'
        },
        'A': {
            alias: 'append',
            describe:
                'append string to each command\n' + 
                'eg: pass arguments\n' +
                'but make sure you not using dash, else use \n' +
                '`-D append="foobar"`', 
            default: '',
            type: 'string'
        },

        // force to use `-D A=B` style
        // to prevent yargs mis-parsed dash, eg: `--append --watch`
        'D': {
            alias: 'define',
            describe: 
                'add definition to render \n' + 
                'template `{{prepend}} <command> {{append}}`',
            default: [],
            type: 'string'
        }
    })
    .group(['m', 'n', 'name-separator', 'raw', 's', 'no-color'], 'General')
    .group(['p', 'c', 'l', 't'], 'Prefix styling')
    .group(['i', 'default-input-target'], 'Input handling')
    .group(['k', 'kill-others-on-fail'], 'Killing other processes')
    .group(['restart-tries', 'restart-after'], 'Restarting')
    .group(['P', 'A', 'D'], 'shorten command')
    // Too much text to write as JS strings, .txt file is better
    .epilogue(fs.readFileSync(__dirname + '/epilogue.txt', { encoding: 'utf8' }))
    .argv;

const prefixColors = args.prefixColors.split(',');
const names = (args.names || '').split(args.nameSeparator);

const _ObjectFromEntries = (l) => {
    const d = {};
    l.forEach(el=>d[el[0]] = el[1]);
    return d;
};
const _define = Array.isArray(args.define) ? args.define : [args.define];
const definition = Object.assign(
    {}, 
    { prepend: args.prepend, append: args.append },
    // desc: convert ["a=1","b=2"] into {"a":"1","b":"2"}
    _ObjectFromEntries(
        _define
            .map(el=>el.split('='))
            .map(x=>[x[0],x.slice(1).join('=')])
    )
);

let lastColor;
concurrently(args._.map((command, index) => {
    // Use documented behaviour of repeating last colour when specifying more commands than colours
    lastColor = prefixColors[index] || lastColor;
    return {
        command,
        argPend: {
            definition
        },
        prefixColor: lastColor,
        name: names[index]
    };
}), {
    inputStream: args.handleInput && process.stdin,
    defaultInputTarget: args.defaultInputTarget,
    killOthers: args.killOthers
        ? ['success', 'failure']
        : (args.killOthersOnFail ? ['failure'] : []),
    maxProcesses: args.maxProcesses,
    raw: args.raw,
    prefix: args.prefix,
    prefixLength: args.prefixLength,
    restartDelay: args.restartAfter,
    restartTries: args.restartTries,
    successCondition: args.success,
    timestampFormat: args.timestampFormat
}).then(
    () => process.exit(0),
    () => process.exit(1)
);
