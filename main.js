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
    prefix: 'pid',

    // By default, color output
    noColor: false
};

function main() {
    parseArgs();
    config = mergeDefaultsWithArgs(config);
    run(program.args);
}

function parseArgs() {
    program
        .version(require('./package.json').version)
        .usage('[options] [command..]')
        .option(
            '-k, --kill-others',
            'kill other processes if one exits or dies'
        );

    program.on('--help', function() {
        console.log('  Examples:');
        console.log('');
        console.log('   - Kill other processes if one exits or dies');
        console.log('');
        console.log('       $ concurrent --kill-others "grunt watch" "http-server"');
        console.log('');

        var url = 'https://github.com/kimmobrunfeldt/node-concurrent';
        console.log('  For more details, visit ' + url);
        console.log('');
    });

    program.parse(process.argv);
}

function mergeDefaultsWithArgs(config) {
    return _.merge(config, program);
}

function logWithPrefix(prefix, text, color) {
    var spaceCount = _.repeat(' ', prefix.length);
    var lines = text.split('\n');

    var bold = getColorFunc(chalk.bold);

    var paddedText = _.map(lines, function(line, i) {
        var coloredLine = color ? color(line) : line;

        if (i > 0) {
            return spaceCount + coloredLine;
        }
        return bold(prefix) + coloredLine;
    }).join('\n');

    console.log(paddedText);
}

function getColorFunc(chalkAttr) {
    if (config.noColor) {
        return function(text) {
            return text;
        };
    } else {
        return chalkAttr;
    }
}

function logError(prefix, buffer) {
    prefix = '[' + prefix + '] ';
    logWithPrefix(prefix, buffer.toString(), getColorFunc(chalk.red.bold));
}

function logEvent(prefix, buffer) {
    prefix = '[' + prefix + '] ';
    logWithPrefix(prefix, buffer.toString(), getColorFunc(chalk.gray.dim));
}

function log(prefix, buffer) {
    prefix = '[' + prefix + '] ';
    logWithPrefix(prefix, buffer.toString());
}

// Map data received from child process to
// format where child information is also embedded
function mapProcessData(child, data) {
    return {child: child, data: data};
}

function run(commands) {
    var children = _.map(commands, function(cmd) {
        var parts = cmd.split(' ');
        return childProcess.spawn(_.head(parts), _.tail(parts));
    });

    var aliveChildren = _.clone(children);
    var exitCodes = [];

    // Transform all process events to rx streams
    var streams = _.map(children, function(child) {
        var streamList = [
            Rx.Node.fromReadableStream(child.stdout),
            Rx.Node.fromReadableStream(child.stderr),
            Rx.Node.fromEvent(child, 'error'),
            Rx.Node.fromEvent(child, 'exit')
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
            exit: mappedStreams[3]
        };
    });

    var stdoutStreams = _.pluck(streams, 'stdout');
    var stdoutStream = Rx.Observable.merge.apply(this, stdoutStreams);

    var stderrStreams = _.pluck(streams, 'stderr');
    var stderrStream = Rx.Observable.merge.apply(this, stderrStreams);

    stdoutStream.subscribe(function(event) {
        var prefix = event.child.pid;
        log(prefix, event.data);
    });

    stderrStream.subscribe(function(event) {
        var prefix = event.child.pid;
        logError(prefix, event.data);
    });

    var exitStreams = _.pluck(streams, 'exit');
    var exitStream = Rx.Observable.merge.apply(this, exitStreams);

    exitStream.subscribe(function(event) {
        var exitCode = event.data;
        logEvent(event.child.pid, 'Exit with code ' + exitCode);
        exitCodes.push(exitCode);

        aliveChildren = _.filter(aliveChildren, function(child) {
            return child.pid !== event.child.pid;
        });

        if (aliveChildren.length === 0) {
            process.exit(_.sum(exitCodes));
        }
    });

    if (config.killOthers) {
        var delayedExit = exitStream.delay(config.killDelay);
        delayedExit.subscribe(function() {
            logEvent('main', 'Sending SIGTERM to other processes..');

            // Send SIGTERM to alive children
            _.each(aliveChildren, function(child) {
                child.kill();
            });
        });
    }
}

main();
