#!/usr/bin/env node
import _ from 'lodash';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import * as defaults from '../src/defaults';
import { concurrently } from '../src/index';
import { readPackage } from './read-package';

const version = String(readPackage().version);
const epilogue = `For documentation and more examples, visit:\nhttps://github.com/open-cli-tools/concurrently/tree/v${version}/docs`;

// Clean-up arguments (yargs expects only the arguments after the program name)
const program = yargs(hideBin(process.argv))
    .parserConfiguration({
        // Avoids options that can be specified multiple times from requiring a `--` to pass commands
        'greedy-arrays': false,
        // Makes sure that --passthrough-arguments works correctly
        'populate--': true,
    })
    .usage('$0 [options] <command ...>')
    .help('h')
    .alias('h', 'help')
    .version(version)
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
                'New processes only spawn after all restart tries of a process.\n' +
                'Exact number or a percent of CPUs available (for example "50%")',
            type: 'string',
        },
        names: {
            alias: 'n',
            describe:
                'List of custom names to be used in prefix template.\n' +
                'Example names: "main,browser,server"',
            type: 'string',
        },
        'name-separator': {
            describe:
                'The character to split <names> on. Example usage:\n' +
                '-n "styles|scripts|server" --name-separator "|"',
            default: defaults.nameSeparator,
        },
        success: {
            alias: 's',
            describe:
                'Which command(s) must exit with code 0 in order for concurrently exit with ' +
                'code 0 too. Options are:\n' +
                '- "first" for the first command to exit;\n' +
                '- "last" for the last command to exit;\n' +
                '- "all" for all commands;\n' +
                // Note: not a typo. Multiple commands can have the same name.
                '- "command-{name}"/"command-{index}" for the commands with that name or index;\n' +
                '- "!command-{name}"/"!command-{index}" for all commands but the ones with that ' +
                'name or index.\n',
            default: defaults.success,
        },
        raw: {
            alias: 'r',
            describe:
                'Output only raw output of processes, disables prettifying ' +
                'and concurrently coloring.',
            type: 'boolean',
        },
        // This one is provided for free. Chalk reads this itself and removes colors.
        // https://www.npmjs.com/package/chalk#chalksupportscolor
        'no-color': {
            describe: 'Disables colors from logging',
            type: 'boolean',
        },
        hide: {
            describe:
                'Comma-separated list of processes to hide the output.\n' +
                'The processes can be identified by their name or index.',
            default: defaults.hide,
            type: 'string',
        },
        group: {
            alias: 'g',
            describe: 'Order the output as if the commands were run sequentially.',
            type: 'boolean',
        },
        timings: {
            describe: 'Show timing information for all processes.',
            type: 'boolean',
            default: defaults.timings,
        },
        matrix: {
            describe:
                'Run many commands as a matrix using space-separated parameters. ' +
                'E.g. concurrently --matrix "a b c" --matrix "1 2 3" "echo {1}{2}"',
            type: 'string',
            array: true,
        },
        'passthrough-arguments': {
            alias: 'P',
            describe:
                'Passthrough additional arguments to commands (accessible via placeholders) ' +
                'instead of treating them as commands.',
            type: 'boolean',
            default: defaults.passthroughArguments,
        },
        teardown: {
            describe:
                'Clean up command(s) to execute before exiting concurrently. Might be specified multiple times.\n' +
                "These aren't prefixed and they don't affect concurrently's exit code.",
            type: 'string',
            array: true,
        },

        // Kill others
        'kill-others': {
            alias: 'k',
            describe: 'Kill other processes if one exits or dies.',
            type: 'boolean',
        },
        'kill-others-on-fail': {
            describe: 'Kill other processes if one exits with non zero status code.',
            type: 'boolean',
        },
        'kill-signal': {
            alias: 'ks',
            describe:
                'Signal to send to other processes if one exits or dies. (SIGTERM/SIGKILL, defaults to SIGTERM)',
            type: 'string',
            default: defaults.killSignal,
        },

        // Prefix
        prefix: {
            alias: 'p',
            describe:
                'Prefix used in logging for each process.\n' +
                'Possible values: index, pid, time, command, name, none, or a template. ' +
                'Example template: "{time}-{pid}"',
            defaultDescription: 'index or name (when --names is set)',
            type: 'string',
        },
        'prefix-colors': {
            alias: 'c',
            describe:
                'Comma-separated list of chalk colors to use on prefixes. ' +
                'If there are more commands than colors, the last color will be repeated.\n' +
                '- Available modifiers: reset, bold, dim, italic, underline, inverse, hidden, strikethrough\n' +
                '- Available colors: black, red, green, yellow, blue, magenta, cyan, white, gray, \n' +
                'any hex values for colors (e.g. #23de43) or auto for an automatically picked color\n' +
                '- Available background colors: bgBlack, bgRed, bgGreen, bgYellow, bgBlue, bgMagenta, bgCyan, bgWhite\n' +
                'See https://www.npmjs.com/package/chalk for more information.',
            default: defaults.prefixColors,
            type: 'string',
        },
        'prefix-length': {
            alias: 'l',
            describe:
                'Limit how many characters of the command is displayed in prefix. ' +
                'The option can be used to shorten the prefix when it is set to "command"',
            default: defaults.prefixLength,
            type: 'number',
        },
        'pad-prefix': {
            describe: 'Pads short prefixes with spaces so that the length of all prefixes match',
            type: 'boolean',
        },
        'timestamp-format': {
            alias: 't',
            describe:
                'Specify the timestamp in Unicode format:\n' +
                'https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table',
            default: defaults.timestampFormat,
            type: 'string',
        },

        // Restarting
        'restart-tries': {
            describe:
                'How many times a process that died should restart.\n' +
                'Negative numbers will make the process restart forever.',
            default: defaults.restartTries,
            type: 'number',
        },
        'restart-after': {
            describe: 'Delay before restarting the process, in milliseconds, or "exponential".',
            default: defaults.restartDelay,
            type: 'string',
        },

        // Input
        'handle-input': {
            alias: 'i',
            describe:
                'Whether input should be forwarded to the child processes. ' +
                'See examples for more information.',
            type: 'boolean',
        },
        'default-input-target': {
            default: defaults.defaultInputTarget,
            describe:
                'Identifier for child process to which input on stdin ' +
                'should be sent if not specified at start of input.\n' +
                'Can be either the index or the name of the process.',
        },
    })
    .group(
        ['m', 'n', 'name-separator', 's', 'r', 'no-color', 'hide', 'g', 'timings', 'P', 'teardown'],
        'General',
    )
    .group(['p', 'c', 'l', 't', 'pad-prefix'], 'Prefix styling')
    .group(['i', 'default-input-target'], 'Input handling')
    .group(['k', 'kill-others-on-fail', 'kill-signal'], 'Killing other processes')
    .group(['restart-tries', 'restart-after'], 'Restarting')
    .epilogue(epilogue);

const args = program.parseSync();

// Get names of commands by the specified separator
const names = (args.names || '').split(args.nameSeparator);

const additionalArguments = _.castArray(args['--'] ?? []).map(String);
const commands = args.passthroughArguments ? args._ : args._.concat(additionalArguments);

if (!commands.length) {
    program.showHelp();
    process.exit();
}

concurrently(
    commands.map((command, index) => ({
        command: String(command),
        name: names[index],
    })),
    {
        handleInput: args.handleInput,
        defaultInputTarget: args.defaultInputTarget,
        killOthers: args.killOthers
            ? ['success', 'failure']
            : args.killOthersOnFail
            ? ['failure']
            : [],
        killSignal: args.killSignal,
        maxProcesses: args.maxProcesses,
        raw: args.raw,
        hide: args.hide.split(','),
        group: args.group,
        prefix: args.prefix,
        prefixColors: args.prefixColors.split(','),
        prefixLength: args.prefixLength,
        padPrefix: args.padPrefix,
        restartDelay:
            args.restartAfter === 'exponential' ? 'exponential' : Number(args.restartAfter),
        restartTries: args.restartTries,
        successCondition: args.success,
        timestampFormat: args.timestampFormat,
        timings: args.timings,
        teardown: args.teardown,
        matrices: args.matrix?.map((matrix) => matrix.split(' ')),
        additionalArguments: args.passthroughArguments ? additionalArguments : undefined,
    },
).result.then(
    () => process.exit(0),
    () => process.exit(1),
);
