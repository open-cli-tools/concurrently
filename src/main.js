#!/usr/bin/env node

var path = require('path');
var program = require('commander');
var _ = require('lodash');

var lib = require('./lib.js');
var config = lib.config;

function main() {
    var firstBase = path.basename(process.argv[0]);
    var secondBase = path.basename(process.argv[1]);
    if (firstBase === 'concurrent' || secondBase === 'concurrent') {
        console.error('Warning: "concurrent" command is deprecated, use "concurrently" instead.\n');
    }

    parseArgs();
    config = mergeDefaultsWithArgs(config);
    applyDynamicDefaults(config)

    lib.run(program.args);
}

function parseArgs() {
    program
        .version(require('../package.json').version)
        .usage('[options] <command ...>')
        .option(
            '-k, --kill-others',
            'kill other processes if one exits or dies'
        )
        .option(
            '--kill-others-on-fail',
            'kill other processes if one exits with non zero status code'
        )
        .option(
            '--no-color',
            'disable colors from logging'
        )
        .option(
            '-p, --prefix <prefix>',
            'prefix used in logging for each process.\n' +
            'Possible values: index, pid, time, command, name, none, or a template. Default: ' +
            'index or name (when --names is set). Example template: "{time}-{pid}"\n'
        )
        .option(
            '-n, --names <names>',
            'List of custom names to be used in prefix template.\n' +
            'Example names: "main,browser,server"\n'
        )
        .option(
            '--name-separator <char>',
            'The character to split <names> on.\n' +
            'Default: "' + config.nameSeparator + '". Example usage: ' +
            'concurrently -n "styles,scripts|server" --name-separator "|" <command ...>\n'
        )
        .option(
            '-c, --prefix-colors <colors>',
            'Comma-separated list of chalk colors to use on prefixes. If there are more commands than colors, the last color will be repeated.\n' +
            'Available modifiers: reset, bold, dim, italic, underline, inverse, hidden, strikethrough\n' +
            'Available colors: black, red, green, yellow, blue, magenta, cyan, white, gray\n' +
            'Available background colors: bgBlack, bgRed, bgGreen, bgYellow, bgBlue, bgMagenta, bgCyan, bgWhite\n' +
            'See https://www.npmjs.com/package/chalk for more information.\n' +
            'Default: "' + config.prefixColors + '". Example: "black.bgWhite,cyan,gray.dim"\n'
        )
        .option(
            '-t, --timestamp-format <format>',
            'specify the timestamp in moment/date-fns format. Default: ' +
            config.timestampFormat + '\n'
        )
        .option(
            '-r, --raw',
            'output only raw output of processes,' +
            ' disables prettifying and concurrently coloring'
        )
        .option(
            '-s, --success <first|last|all>',
            'Return exit code of zero or one based on the success or failure ' +
            'of the "first" child to terminate, the "last" child, or succeed ' +
            ' only if "all" child processes succeed. Default: ' +
            config.success + '\n'
        )
        .option(
            '-l, --prefix-length <length>',
            'limit how many characters of the command is displayed in prefix.\n' +
            'The option can be used to shorten long commands.\n' +
            'Works only if prefix is set to "command". Default: ' +
            config.prefixLength + '\n'
        )
        .option(
            '--allow-restart',
            'Restart a process which died. Default: ' +
            config.allowRestart + '\n'
        )
        .option(
            '--restart-after <miliseconds>',
            'delay time to respawn the process. Default: ' +
            config.restartAfter + '\n'
        )
        .option(
            '--restart-tries <times>',
            'limit the number of respawn tries. Default: ' +
            config.restartTries + '\n'
        );

    program.on('--help', function() {
        var help = [
            '  Examples:',
            '',
            '   - Kill other processes if one exits or dies',
            '',
            '       $ concurrently --kill-others "grunt watch" "http-server"',
            '',
            '   - Kill other processes if one exits with non zero status code',
            '',
            '       $ concurrently --kill-others-on-fail "npm run build:client" "npm run build:server"',
            '',
            '   - Output nothing more than stdout+stderr of child processes',
            '',
            '       $ concurrently --raw "npm run watch-less" "npm run watch-js"',
            '',
            '   - Normal output but without colors e.g. when logging to file',
            '',
            '       $ concurrently --no-color "grunt watch" "http-server" > log',
            '',
            '   - Custom prefix',
            '',
            '       $ concurrently --prefix "{time}-{pid}" "npm run watch" "http-server"',
            '',
            '   - Custom names and colored prefixes',
            '',
            '       $ concurrently --names "HTTP,WATCH" -c "bgBlue.bold,bgMagenta.bold" "http-server" "npm run watch"',
            ''
        ];
        console.log(help.join('\n'));

        var url = 'https://github.com/kimmobrunfeldt/concurrently';
        console.log('  For more details, visit ' + url);
        console.log('');
    });

    program.parse(process.argv);
}

function mergeDefaultsWithArgs(config) {
    // This will pollute config object with other attributes from program too
    return _.merge(config, program);
}

function applyDynamicDefaults(config) {
    if (!config.prefix) {
        config.prefix = config.names ? 'name' : 'index';
    }
}

main();