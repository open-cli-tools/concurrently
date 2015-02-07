#!/usr/bin/env node

var Rx = require('rx');
var Promise = require('bluebird');
var program = require('commander');
var _ = require('lodash');
var chalk = require('chalk');
var childProcess = Promise.promisifyAll(require('child_process'));
require('./lodash-mixins');


var config = {
    // Kill other processes if one dies
    killOthers: false,

    // How much in ms we wait before killing other processes
    killDelay: 1000,

    // Prefix logging with pid
    // Possible values: 'pid', 'none', ''
    prefix: 'command',

    // How many characters to display from start of command in prefix if
    // command is defined. Note that also '..' will be added as a suffix
    commandPrefixLength: 10,

    // By default, color output
    color: true,
};

function main() {
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
            '-p, --prefix [prefix]',
            'prefix used in logging for each process.' +
            ' Possible values: pid, none, command'
        );

    program.on('--help', function() {
        console.log('  Examples:');
        console.log('');
        console.log('   - Kill other processes if one exits or dies');
        console.log('');
        console.log('       $ concurrent --kill-others "grunt watch" "http-server"');
        console.log('');

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

function run(commands) {
    var pidToCommand = {};
    var children = _.map(commands, function(cmd) {
        var parts = cmd.split(' ');
        var child = childProcess.spawn(_.head(parts), _.tail(parts));

        pidToCommand[child.pid] = cmd;
        return child;
    });

    var aliveChildren = _.clone(children);
    var exitCodes = [];

    // Transform all process events to rx streams
    var streams = _.map(children, function(child) {
        var streamList = [
            Rx.Node.fromReadableStream(child.stdout),
            Rx.Node.fromReadableStream(child.stderr),
            Rx.Node.fromEvent(child, 'error'),
            Rx.Node.fromEvent(child, 'close')
        ];

        var mappedStreams = _.map(streamList, function(stream) {
            return stream.map(function(data) {
                return {child: child, data: data};
            });
        });

        return {
            stdout: mappedStreams[0],
            stderr: mappedStreams[1],
            error: mappedStreams[2],
            close: mappedStreams[3]
        };
    });

    var stdoutStreams = _.pluck(streams, 'stdout');
    var stdoutStream = Rx.Observable.merge.apply(this, stdoutStreams);

    var stderrStreams = _.pluck(streams, 'stderr');
    var stderrStream = Rx.Observable.merge.apply(this, stderrStreams);

    stdoutStream.subscribe(function(event) {
        var prefix = getPrefix(pidToCommand[event.child.pid], event.child);
        log(prefix, event.data.toString());
    });

    stderrStream.subscribe(function(event) {
        var prefix = getPrefix(pidToCommand[event.child.pid], event.child);
        logError(prefix, event.data.toString());
    });

    var closeStreams = _.pluck(streams, 'close');
    var closeStream = Rx.Observable.merge.apply(this, closeStreams);

    // TODO: Is it possible that amount of close events !== count of spawned?
    closeStream.subscribe(function(event) {
        var exitCode = event.data;
        exitCodes.push(exitCode);

        var command = pidToCommand[event.child.pid];
        var prefix = getPrefix(command, event.child);
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
    });

    // Output emitted errors from child process
    var errorStreams = _.pluck(streams, 'error');
    var processErrorStream = Rx.Observable.merge.apply(this, errorStreams);
    processErrorStream.subscribe(function(event) {
        var command = pidToCommand[event.child.pid];
        logError('[main] ', 'Error occured when running command: ' + command);
        logError('[main] ', event.data.toString());
    });

    if (config.killOthers) {
        // Give other processes some time to stop cleanly before killing them
        var delayedExit = closeStream.delay(config.killDelay);

        delayedExit.subscribe(function() {
            logEvent('[main] ', 'Sending SIGTERM to other processes..');

            // Send SIGTERM to alive children
            _.each(aliveChildren, function(child) {
                child.kill();
            });
        });
    }
}

function colorText(text, color) {
    if (!config.color) {
        return text;
    } else {
        return color(text);
    }
}

function getPrefix(command, child) {
    if (config.prefix === 'pid') {
        return '[' + child.pid + '] ';
    } else if (config.prefix === 'command') {
        return '[' + shortenText(command, config.commandPrefixLength) + '] ';
    }

    return '';
}

function shortenText(text, length, suffix) {
    if (text.length <= length) {
        return text;
    }

    suffix = _.isString(suffix) ? suffix : '..';
    return text.substring(0, length) + suffix;
}

function log(prefix, text) {
    logWithPrefix(prefix, text);
}

function logEvent(prefix, text) {
    logWithPrefix(prefix, text, chalk.gray.dim);
}

function logError(prefix, text) {
    logWithPrefix(prefix, text, chalk.red.bold);
}

function logWithPrefix(prefix, text, color) {
    var lines = text.split('\n');

    var paddedLines = _.map(lines, function(line, i) {
        var coloredLine = color ? colorText(line, color) : line;

        if (i > 0) {
            return _.repeat(' ', prefix.length) + coloredLine;
        }
        return colorText(prefix, chalk.bold) + coloredLine;
    });

    console.log(paddedLines.join('\n'));
}

main();
