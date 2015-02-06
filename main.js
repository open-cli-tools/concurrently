#!/usr/bin/env node

var Rx = require('rx');
var Promise = require('bluebird');
var program = require('commander');
var _ = require('lodash');
var chalk = require('chalk');
var childProcess = Promise.promisifyAll(require('child_process'));

var config = {
    // Kill other processes if one dies
    kill: true
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
            '-n, --no-kill',
            'prevent killing other processes if one dies'
        );

    program.on('--help', function() {
        console.log('  Examples:');
        console.log('');
        console.log('   - Prevent stopping other processes if one dies');
        console.log('');
        console.log('       $ conc --no-kill "grunt watch" "http-server"');
        console.log('');

        var url = 'https://github.com/kimmobrunfeldt/node-concurrent';
        console.log('  For more details, visit ' + url);
        console.log('');
    });

    program.parse(process.argv);
}

function mergeDefaultsWithArgs(config) {
    return {
        kill: config.kill
    };
}

function logWithPrefix(prefix, text, color) {
    var spaceCount = Array(prefix.length + 1).join(' ');
    var lines = text.split('\n');

    var newText = _.map(lines, function(line, i) {
        var coloredLine = color ? color(line) : line;
        if (i > 0) return spaceCount + coloredLine;
        return chalk.bold(prefix) + coloredLine;
    }).join('\n');

    console.log(newText);
}

function logError(childProcess, buffer) {
    var prefix = '[' + childProcess.pid + '] ';
    logWithPrefix(prefix, buffer.toString(), chalk.red.bold);
}

function log(childProcess, buffer) {
    var prefix = '[' + childProcess.pid + '] ';
    logWithPrefix(prefix, buffer.toString());
}

function run(commands) {
    var children = _.map(commands, function(cmd) {
        var parts = cmd.split(' ');
        return childProcess.spawn(_.head(parts), _.tail(parts));
    });

    var outStreams = _.map(children, function(child) {
        return Rx.Node.fromReadableStream(child.stdout)
        .map(function(buffer) {
            return {buffer: buffer, childProcess: child};
        });
    });

    var errStreams = _.map(children, function(child) {
        return Rx.Node.fromReadableStream(child.stderr)
        .map(function(buffer) {
            return {buffer: buffer, childProcess: child};
        });
    });

    var mergedOut = _.reduce(_.tail(outStreams), function(memo, stream) {
        return memo.merge(stream);
    }, _.head(outStreams));

    var mergedErr = _.reduce(_.tail(errStreams), function(memo, stream) {
        return memo.merge(stream);
    }, _.head(errStreams));

    mergedOut.subscribe(function(data) {
        log(data.childProcess, data.buffer);
    });

    mergedErr.subscribe(function(data) {
        logError(data.childProcess, data.buffer);
    });
}

main();
