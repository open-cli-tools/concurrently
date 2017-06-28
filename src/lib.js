#!/usr/bin/env node

var Rx = require('rx');
var path = require('path');
var formatDate = require('date-fns/format');
var _ = require('lodash');
var treeKill = require('tree-kill');
var chalk = require('chalk');
var spawn = require('spawn-command');
var supportsColor = require('supports-color');
var IS_WINDOWS = /^win/.test(process.platform);

var config = {
    // Kill other processes if one dies
    killOthers: false,

    // Kill other processes if one exits with non zero status code
    killOthersOnFail: false,

    // Return success or failure of the 'first' child to terminate, the 'last' child,
    // or succeed only if 'all' children succeed
    success: 'all',

    // Prefix logging with pid
    // Possible values: 'pid', 'none', 'time', 'command', 'index', 'name'
    prefix: '',

    // List of custom names to be used in prefix template
    names: '',

    // What to split the list of custom names on
    nameSeparator: ',',

    // Comma-separated list of chalk color paths to use on prefixes.
    prefixColors: 'gray.dim',

    // moment/date-fns format
    timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',

    // How many characters to display from start of command in prefix if
    // command is defined. Note that also '..' will be added in the middle
    prefixLength: 10,

    // By default, color output
    color: true,

    // If true, the output will only be raw output of processes, nothing more
    raw: false,

    // If true, the process restart when it exited with status code non-zero
    allowRestart: false,

    // By default, restart instantly
    restartAfter: 0,

    // By default, restart once
    restartTries: 1,

    // callback called when all children exits    
    exit: function(childExitCodes) {
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
};

function stripCmdQuotes(cmd) {
    // Removes the quotes surrounding a command.
    if (cmd[0] === '"' || cmd[0] === '\'') {
        return cmd.substr(1, cmd.length - 2);
    } else {
        return cmd;
    }
}

function run(commands) {
    var childrenInfo = {};
    var lastPrefixColor = _.get(chalk, chalk.gray.dim);
    var prefixColors = config.prefixColors.split(',');
    var names = config.names.split(config.nameSeparator);
    var children = _.map(commands, function(cmd, index) {
        // Remove quotes.
        cmd = stripCmdQuotes(cmd);

        var spawnOpts = config.raw ? { stdio: 'inherit' } : {};
        if (IS_WINDOWS) {
            spawnOpts.detached = false;
        }
        if (supportsColor) {
            spawnOpts.env = Object.assign({ FORCE_COLOR: supportsColor.level }, process.env)
        }

        var child = spawnChild(cmd, spawnOpts);

        if (index < prefixColors.length) {
            var prefixColorPath = prefixColors[index];
            lastPrefixColor = _.get(chalk, prefixColorPath, chalk.gray.dim);
        }

        var name = index < names.length ? names[index] : '';
        childrenInfo[child.pid] = {
            command: cmd,
            index: index,
            name: name,
            options: spawnOpts,
            restartTries: config.restartTries,
            prefixColor: lastPrefixColor
        };
        return child;
    });

    var streams = toStreams(children);

    handleChildEvents(streams, children, childrenInfo);

    ['SIGINT', 'SIGTERM'].forEach(function(signal) {
        process.on(signal, function() {
            children.forEach(function(child) {
                treeKill(child.pid, signal);
            });
        });
    });
}

function spawnChild(cmd, options) {
    var child;
    try {
        child = spawn(cmd, options);
    } catch (e) {
        logError('', chalk.gray.dim, 'Error occured when executing command: ' + cmd);
        logError('', chalk.gray.dim, e.stack);
        process.exit(1);
    }
    return child;
}

function toStreams(children) {
    // Transform all process events to rx streams
    return _.map(children, function(child) {
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
                return { child: child, data: data };
            });

            return memo;
        }, {});
    });
}

function handleChildEvents(streams, children, childrenInfo) {
    handleClose(streams, children, childrenInfo);
    handleError(streams, childrenInfo);
    if (!config.raw) {
        handleOutput(streams, childrenInfo, 'stdout');
        handleOutput(streams, childrenInfo, 'stderr');
    }
}

function handleOutput(streams, childrenInfo, source) {
    var sourceStreams = _.map(streams, source);
    var combinedSourceStream = Rx.Observable.merge.apply(this, sourceStreams);

    combinedSourceStream.subscribe(function(event) {
        var prefix = getPrefix(childrenInfo, event.child);
        var prefixColor = childrenInfo[event.child.pid].prefixColor;
        log(prefix, prefixColor, event.data.toString());
    });
}

function handleClose(streams, children, childrenInfo) {
    var allChildren = _.clone(children);
    var aliveChildren = _.clone(children);
    var exitCodes = [];
    var closeStreams = _.map(streams, 'close');
    var closeStream = Rx.Observable.merge.apply(this, closeStreams);
    var othersKilled = false

    // TODO: Is it possible that amount of close events !== count of spawned?
    closeStream.subscribe(function(event) {
        var exitCode = event.data;
        var nonSuccess = exitCode !== 0;
        exitCodes[allChildren.indexOf(event.child)] = exitCode;

        var prefix = getPrefix(childrenInfo, event.child);
        var childInfo = childrenInfo[event.child.pid];
        var prefixColor = childInfo.prefixColor;
        var command = childInfo.command;
        logEvent(prefix, prefixColor, command + ' exited with code ' + exitCode);

        aliveChildren = _.filter(aliveChildren, function(child) {
            return child.pid !== event.child.pid;
        });

        if (nonSuccess && config.allowRestart && childInfo.restartTries--) {
            respawnChild(event, childrenInfo);
            return;
        }

        if (aliveChildren.length === 0) {
            config.exit(exitCodes);
        }
        if (!othersKilled) {
            if (config.killOthers) {
                killOtherProcesses(aliveChildren);
                othersKilled = true;
            } else if (config.killOthersOnFail && nonSuccess) {
                killOtherProcesses(aliveChildren);
                othersKilled = true;
            }
        }
    });
}

function respawnChild(event, childrenInfo) {
    setTimeout(function() {
        var childInfo = childrenInfo[event.child.pid];
        var prefix = getPrefix(childrenInfo, event.child);
        var prefixColor = childInfo.prefixColor;
        logEvent(prefix, prefixColor, childInfo.command + ' restarted');
        var newChild = spawnChild(childInfo.command, childInfo.options);

        childrenInfo[newChild.pid] = childrenInfo[event.child.pid];
        delete childrenInfo[event.child.pid];

        var children = [newChild];
        var streams = toStreams(children);
        handleChildEvents(streams, children, childrenInfo);
    }, config.restartAfter);
}

function killOtherProcesses(processes) {
    logEvent('--> ', chalk.gray.dim, 'Sending SIGTERM to other processes..');

    // Send SIGTERM to alive children
    _.each(processes, function(child) {
        treeKill(child.pid, 'SIGTERM');
    });
}

function handleError(streams, childrenInfo) {
    // Output emitted errors from child process
    var errorStreams = _.map(streams, 'error');
    var processErrorStream = Rx.Observable.merge.apply(this, errorStreams);

    processErrorStream.subscribe(function(event) {
        var command = childrenInfo[event.child.pid].command;
        logError('', chalk.gray.dim, 'Error occured when executing command: ' + command);
        logError('', chalk.gray.dim, event.data.stack);
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
    if (_.includes(_.keys(prefixes), config.prefix)) {
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
    prefixes.pid = child.pid;
    prefixes.index = childrenInfo[child.pid].index;
    prefixes.name = childrenInfo[child.pid].name;
    prefixes.time = formatDate(Date.now(), config.timestampFormat);

    var command = childrenInfo[child.pid].command;
    prefixes.command = shortenText(command, config.prefixLength);
    return prefixes;
}

function shortenText(text, length, cut) {
    if (text.length <= length) {
        return text;
    }
    cut = _.isString(cut) ? cut :  '..';

    var endLength = Math.floor(length / 2);
    var startLength = length - endLength;

    var first = text.substring(0, startLength);
    var last = text.substring(text.length - endLength, text.length);
    return first + cut + last;
}

function log(prefix, prefixColor, text) {
    logWithPrefix(prefix, prefixColor, text);
}

function logEvent(prefix, prefixColor, text) {
    if (config.raw) return;

    logWithPrefix(prefix, prefixColor, text, chalk.gray.dim);
}

function logError(prefix, prefixColor, text) {
    // This is for now same as log, there might be separate colors for stderr
    // and stdout
    logWithPrefix(prefix, prefixColor, text, chalk.red.bold);
}

function logWithPrefix(prefix, prefixColor, text, color) {
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
    // Do not bgColor trailing space
    var coloredPrefix = colorText(prefix.replace(/ $/, ''), prefixColor) + ' ';
    var paddedLines = _.map(lines, function(line, i) {
        var coloredLine = color ? colorText(line, color) : line;
        return coloredPrefix + coloredLine;
    });

    console.log(paddedLines.join('\n'));
}

module.exports = {
    config,
    run
}