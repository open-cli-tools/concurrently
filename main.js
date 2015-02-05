#!/usr/bin/env node

var fs = require('fs');

var Promise = require('bluebird');
var program = require('commander');
var _ = require('lodash');

var childProcess = Promise.promisifyAll(require('child_process'));

var config = {
    // Kill other processes if one dies
    kill: true
};

function main() {
    parseArgs();
    config = mergeDefaultsWithArgs(config);

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
        console.log('  For more details, visit https://github.com/kimmobrunfeldt/node-concurrent');
        console.log('');
    });

    program.parse(process.argv);
}

function mergeDefaultsWithArgs(config) {
    return {
        kill: config.kill
    };
}


function run() {
    //childProcess.execAsync()
    Promise.map(commands)
    .then(function() {

    })
    .any(function() {
        // If any of the promises resolves / rejects,
        // stop other processes
    })
    .catch(function() {

    })
}

main();
