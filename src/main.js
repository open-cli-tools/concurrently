#!/usr/bin/env node

var Rx = require('rx');
var path = require('path');
var Promise = require('bluebird');
var moment = require('moment');
var program = require('commander');
var _ = require('lodash');
var chalk = require('chalk');
var spawn = Promise.promisifyAll(require('cross-spawn'));
var isWindows = /^win/.test(process.platform);

var config = {
    // Kill other processes if one dies
    killOthers: false,

    // How much in ms we wait before killing other processes
    killDelay: 1000,

    // Return success or failure of the 'first' child to terminate, the 'last' child,
    // or succeed only if 'all' children succeed
    success: 'all',

    // Prefix logging with pid
    // Possible values: 'pid', 'none', 'time', 'command', 'index'
    prefix: 'index',

    // moment format
    timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',

    // How many characters to display from start of command in prefix if
    // command is defined. Note that also '..' will be added in the middle
    prefixLength: 10,

    // By default, color output
    color: true,

    // If true, the output will only be raw output of processes, nothing more
    raw: false
};

function main() {
    var firstBase = path.basename(process.argv[0]);
    var secondBase = path.basename(process.argv[1]);
    if (firstBase === 'concurrent' || secondBase === 'concurrent') {
        console.error('"concurrent" command is deprecated, use "concurrently" instead.\n');
    }

    parseArgs();
    config = mergeDefaultsWithArgs(config);
    run(program.args);
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
            '--no-color',
            'disable colors from logging'
        )
        .option(
            '-p, --prefix <prefix>',
            'prefix used in logging for each process.\n' +
            'Possible values: index, pid, time, command, none or a template. Default: ' +
            config.prefix + '. Example template "{time}-{pid}"\n'
        )
        .option(
            '-t, --timestamp-format <format>',
            'specify the timestamp in moment format. Default: ' +
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
        );

    program.on('--help', function() {
        var help = [
            '  Examples:',
            '',
            '   - Kill other processes if one exits or dies',
            '',
            '       $ concurrently --kill-others "grunt watch" "http-server"',
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
            '       $ concurrently --prefix "{time}-{pid}" "grunt watch" "http-server"',
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

function stripCmdQuotes(cmd) {
    // Removes the quotes surrounding a command.
    if (cmd[0] === '"' || cmd[0] === '\'') {
        return cmd.substr(1, cmd.length - 2);
    } else {
        return cmd;
    }
}

function separateCmdArgs(cmd) {
    // We're splitting up the command into space-separated parts.
    // The first item is the command, all remaining items are the
    // arguments. To permit commands with spaces in the name
    // (or directory name), double slashes is a usable escape sequence.
    var escape = cmd.search('\\\s'),
        divide = cmd.search(/[^\\]\s/),
        path, args, parts;

    if (escape === -1) {
        // Not an escaped path. Most common case.
        parts = cmd.split(' ');
    } else if (escape > -1 && divide === -1) {
        // Escaped path without arguments.
        parts = [cmd.replace('\\ ', ' ')];
    } else {
        // Escaped path with arguments.
        path = cmd.substr(0, divide + 1).replace('\\ ', ' ');
        args = cmd.substr(divide + 1).split(' ').filter(function(part) {
            return part.trim() != '';
        });
        parts = [path].concat(args);
    }

    // Parts contains the command as the first item and any arguments
    // as subsequent items.
    return parts;
}

function run(commands) {
    var childrenInfo = {};
    var children = _.map(commands, function(cmd, index) {
        // Remove quotes.
        cmd = stripCmdQuotes(cmd);

        // Split the command up in the command path and its arguments.
        var parts = separateCmdArgs(cmd);

        var spawnOpts = config.raw ? {stdio: 'inherit'} : {};
        var child;
        try {
            child = spawn(_.head(parts), _.tail(parts), spawnOpts);
        } catch (e) {
            logError('', 'Error occured when executing command: ' + cmd);
            logError('', e.stack);
            process.exit(1);
        }

        childrenInfo[child.pid] = {
            command: cmd,
            index: index
        };
        return child;
    });

    // Transform all process events to rx streams
    var streams = _.map(children, function(child) {
        var childStreams = {
            error: Rx.Node.fromEvent(child, 'error'),
            close: Rx.Node.fromEvent(child, 'close')
        };
        if (!config.raw) {
            childStreams.stdout = Rx.Node.fromReadableStream(child.stdout);
            childStreams.stderr = Rx.Node.fromReadableStream(child.stderr);
        }

        return _.reduce(childStreams, function(memo, stream, key) {
            memo[key] = stream.map(function(data) {
                return {child: child, data: data};
            });

            return memo;
        }, {});
    });

    handleClose(streams, children, childrenInfo);
    handleError(streams, childrenInfo);
    if (!config.raw) {
        handleOutput(streams, childrenInfo, 'stdout');
        handleOutput(streams, childrenInfo, 'stderr');
    }
}

function handleOutput(streams, childrenInfo, source) {
    var sourceStreams = _.pluck(streams, source);
    var combinedSourceStream = Rx.Observable.merge.apply(this, sourceStreams);

    combinedSourceStream.subscribe(function(event) {
        var prefix = getPrefix(childrenInfo, event.child);
        log(prefix, event.data.toString());
    });
}

function handleClose(streams, children, childrenInfo) {
    var aliveChildren = _.clone(children);
    var exitCodes = [];
    var closeStreams = _.pluck(streams, 'close');
    var closeStream = Rx.Observable.merge.apply(this, closeStreams);

    // TODO: Is it possible that amount of close events !== count of spawned?
    closeStream.subscribe(function(event) {
        var exitCode = event.data;
        exitCodes.push(exitCode);

        var prefix = getPrefix(childrenInfo, event.child);
        var command = childrenInfo[event.child.pid].command;
        logEvent(prefix, command + ' exited with code ' + exitCode);

        aliveChildren = _.filter(aliveChildren, function(child) {
            return child.pid !== event.child.pid;
        });

        if (aliveChildren.length === 0) {
            exit(exitCodes);
        }
    });

    if (config.killOthers) {
        // Give other processes some time to stop cleanly before killing them
        var delayedExit = closeStream.delay(config.killDelay);

        delayedExit.subscribe(function() {
            logEvent('--> ', 'Sending SIGTERM to other processes..');

            // Send SIGTERM to alive children
            _.each(aliveChildren, function(child) {
                if(!isWindows) {
                    child.kill();
                } else {
                    spawn('taskkill', ["/pid", child.pid, '/f', '/t']);
                }
            });
        });
    }
}

function exit(childExitCodes) {
    var success;
    switch (config.success) {
        case 'first':
            success = _.first(childExitCodes) === 0;
            break;
        case 'last':
            success = _.last(childExitCodes) === 0;
            break;
        default:
            success = _.every(childExitCodes, function(code) {
                return code === 0;
            });
    }
    process.exit(success ? 0 : 1);
}

function handleError(streams, childrenInfo) {
    // Output emitted errors from child process
    var errorStreams = _.pluck(streams, 'error');
    var processErrorStream = Rx.Observable.merge.apply(this, errorStreams);

    processErrorStream.subscribe(function(event) {
        var command = childrenInfo[event.child.pid].command;
        logError('', 'Error occured when executing command: ' + command);
        logError('', event.data.stack);
    });
}

function colorText(text, color) {
    if (!config.color) {
        return text;
    } else {
        return color(text);
    }
}

function getPrefix(childrenInfo, child) {
    var prefixes = getPrefixes(childrenInfo, child);
    if (_.contains(_.keys(prefixes), config.prefix)) {
        return '[' + prefixes[config.prefix] + '] ';
    }

    return _.reduce(prefixes, function(memo, val, key) {
        var re = new RegExp('{' + key + '}', 'g');
        return memo.replace(re, val);
    }, config.prefix) + ' ';
}

function getPrefixes(childrenInfo, child) {
    var prefixes = {};

    prefixes.none = '';
    prefixes.pid = child.pid
    prefixes.index = childrenInfo[child.pid].index
    prefixes.time = moment().format(config.timestampFormat);

    var command = childrenInfo[child.pid].command;
    prefixes.command = shortenText(command, config.prefixLength);
    return prefixes;
}

function shortenText(text, length, cut) {
    if (text.length <= length) {
        return text;
    }
    cut = _.isString(cut) ? cut : '..';

    var endLength = Math.floor(length / 2);
    var startLength = length - endLength;

    var first = text.substring(0, startLength);
    var last = text.substring(text.length - endLength, text.length);
    return first + cut + last;
}

function log(prefix, text) {
    logWithPrefix(prefix, text);
}

function logEvent(prefix, text) {
    if (config.raw) return;

    logWithPrefix(prefix, text, chalk.gray.dim);
}

function logError(prefix, text) {
    // This is for now same as log, there might be separate colors for stderr
    // and stdout
    logWithPrefix(prefix, text, chalk.red.bold);
}

function logWithPrefix(prefix, text, color) {
    var lastChar = text[text.length - 1];
    if (config.raw) {
        if (lastChar !== '\n') {
            text += '\n';
        }

        process.stdout.write(text);
        return;
    }

    if (lastChar === '\n') {
        // Remove extra newline from the end to prevent extra newlines in input
        text = text.slice(0, text.length - 1);
    }

    var lines = text.split('\n');
    var paddedLines = _.map(lines, function(line, i) {
        var coloredLine = color ? colorText(line, color) : line;
        return colorText(prefix, chalk.gray.dim) + coloredLine;
    });

    console.log(paddedLines.join('\n'));
}

main();
