var childProcess = require('child_process');
var _ = require('lodash');
var readline = require('readline')
var shellQuote = require('shell-quote');

// If true, output of commands are shown
var DEBUG_TESTS = process.env.DEBUG_TESTS === 'true';

function run(cmd, opts) {
    opts = _.merge({
        // If set to a function, it will be called for each line
        // written to the child process's stdout as (line, child)
        onOutputLine: undefined,
    }, opts);

    var child;
    var parts = shellQuote.parse(cmd);
    try {
        child = childProcess.spawn(_.head(parts), _.tail(parts), {
            stdio: DEBUG_TESTS && !opts.onOutputLine ? 'inherit': null,
        });
    } catch (e) {
        return Promise.reject(e);
    }

    if (opts.onOutputLine) {
        readLines(child, opts.onOutputLine);
    }

    return new Promise(function(resolve, reject) {
        child.on('error', function(err) {
            reject(err);
        });

        child.on('close', function(exitCode) {
            resolve(exitCode);
        });
    });
}

function readLines(child, callback) {
    var rl = readline.createInterface({
        input: child.stdout,
        output: null
    });

    rl.on('line', function(line) {
        if (DEBUG_TESTS) {
            console.log(line);
        }

        callback(line, child)
    });
}

module.exports = {
    run: run
};
