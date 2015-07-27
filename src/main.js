#!/usr/bin/env node

var Rx = require('rx');
var Promise = require('bluebird');
var program = require('commander');
var _ = require('lodash');
var chalk = require('chalk');
var spawn = Promise.promisifyAll(require('cross-spawn'));
require('./lodash-mixins');


var config = {
    // Kill other processes if one dies
    killOthers: false,

    // How much in ms we wait before killing other processes
    killDelay: 1000,

    // Prefix logging with pid
    // Possible values: 'pid', 'none', 'command', 'index'
    prefix: 'index',

    // How many characters to display from start of command in prefix if
    // command is defined. Note that also '..' will be added in the middle
    prefixLength: 10,

    // By default, color output
    color: true,

    // If true, the output will only be raw output of processes, nothing more
    raw: false,

    // If string, commands are launched in sequence. Launches the next process
    // when the current process logs this value. Possible values: string or false
    nextSignal: false
};

function main() {
    parseArgs();
    config = mergeDefaultsWithArgs(config);
    config.nextSignal = config.nextSignal ? RegExp(config.nextSignal) : null;
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
            'Possible values: index, pid, command, none. Default: ' +
            config.prefix + '\n'
        )
        .option(
            '-r, --raw',
            'output only raw output of processes,' +
            ' disables prettifying and colors'
        )
        .option(
            '-n, --next-signal',
            'if string, commands are launched in sequence. Launches the next process\n' +
            'when the current process logs this value. Possible values: string or false'
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
            '       $ concurrent --kill-others "grunt watch" "http-server"',
            '',
            '   - Output nothing more than stdout+stderr of child processes',
            '',
            '       $ concurrent --raw "npm run watch-less" "npm run watch-js"',
            '',
            '   - Normal output but without colors e.g. when logging to file',
            '',
            '       $ concurrent --no-color "grunt watch" "http-server" > log',
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

function forEachGenerator(arr, func) {
    var i = 0;

    function next() {
        if (++i > arr.length) return;
        func(arr[i - 1], i - 1, next);
    }
    next();
}

function run(commands) {
    var childrenInfo = {};
    var children = [];

    var nextFunc;
    var subscribers = subscribers = [
        new StreamSubscriber(function(event) {
            var prefix = getPrefix(childrenInfo, event.child);
            var str = event.data.toString();
            if (nextFunc && config.nextSignal.test(str)) {
                nextFunc();
            } else {
                log(prefix, str);
            }
        }),
        new StreamSubscriber(function(event) {
            var prefix = getPrefix(childrenInfo, event.child);
            log(prefix, event.data.toString());
        }),
        new StreamSubscriber(function(event) {
            var command = childrenInfo[event.child.pid].command;
            logError('', 'Error occured when executing command: ' + command);
            logError('', event.data.stack);
        }),
        new CloseStreamSubscriber(children, childrenInfo)
    ];

    forEachGenerator(commands, function(cmd, index, next) {
        nextFunc = config.nextSignal && next;
        if (!config.nextSignal) {
            next();
        }

        var parts = cmd.split(' ');
        var child;
        try {
            child = spawn(_.head(parts), _.tail(parts));
        } catch (e) {
            logError('', 'Error occured when executing command: ' + cmd);
            logError('', e.stack);
            process.exit(1);
        }

        childrenInfo[child.pid] = {
            command: cmd,
            index: index
        };
        children.push(child);

        var streamList = _.map([
            Rx.Node.fromReadableStream(child.stdout),
            Rx.Node.fromReadableStream(child.stderr),
            Rx.Node.fromEvent(child, 'error'),
            Rx.Node.fromEvent(child, 'close')
        ], function(stream) {
            return stream.map(function(data) {
                return {child: child, data: data};
            });
        });

        subscribers.forEach(function(s, i) {
            s.add(streamList[i]);
        });
    });
}

function StreamSubscriber(subscribe) {
    var subscription;
    var streams = [];

    this.add = function(stream) {
        if (subscription) {
            subscription.dispose();
        }
        streams.push(stream);
        var mergedStreams = Rx.Observable.merge.apply(this, streams);
        subscription = mergedStreams.subscribe(subscribe);
    };
}

function CloseStreamSubscriber(children, childrenInfo) {
    var aliveChildren = _.clone(children);
    var exitCodes = [];

    var subscriptions = [];
    var streams = [];

    this.add = function(stream) {
        subscriptions.forEach(function(s) {
            s.dispose();
        });
        streams.push(stream);
        var mergedStreams = Rx.Observable.merge.apply(this, streams);

        subscriptions.push(mergedStreams.subscribe(function(event) {
            var exitCode = event.data;
            exitCodes.push(exitCode);

            var prefix = getPrefix(childrenInfo, event.child);
            var command = childrenInfo[event.child.pid].command;
            logEvent(prefix, command + ' exited with code ' + exitCode);

            aliveChildren = _.filter(aliveChildren, function(child) {
                return child.pid !== event.child.pid;
            });

            if (aliveChildren.length === 0) {
                // Final exit code is 0 when all processes ran succesfully,
                // in other cases exit code 1 is used
                var someFailed = _.some(exitCodes, function(code) {
                    return code !== 0 || code === null;
                });
                var finalExitCode = someFailed ? 1 : 0;
                process.exit(finalExitCode);
            }
        }));

        if (config.killOthers) {
            // Give other processes some time to stop cleanly before killing them
            var delayedExit = mergedStreams.delay(config.killDelay);

            subscriptions.push(delayedExit.subscribe(function() {
                logEvent('--> ', 'Sending SIGTERM to other processes..');

                // Send SIGTERM to alive children
                _.each(aliveChildren, function(child) {
                    child.kill();
                });
            }));
        }
    };
}

function colorText(text, color) {
    if (!config.color) {
        return text;
    } else {
        return color(text);
    }
}

function getPrefix(childrenInfo, child) {
    if (config.prefix === 'pid') {
        return '[' + child.pid + '] ';
    } else if (config.prefix === 'command') {
        var command = childrenInfo[child.pid].command;
        return '[' + shortenText(command, config.prefixLength) + '] ';
    } else if (config.prefix === 'index') {
        return '[' + childrenInfo[child.pid].index + '] ';
    }

    return '';
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
