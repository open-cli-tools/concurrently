const assert = require('assert');
const _ = require('lodash');
const spawn = require('spawn-command');

const StripQuotes = require('./command-parser/strip-quotes');
const ExpandNpmShortcut = require('./command-parser/expand-npm-shortcut');
const ExpandNpmWildcard = require('./command-parser/expand-npm-wildcard');

const CloseHandler = require('./flow-control/close-handler');
const OutputHandler = require('./flow-control/output-handler');
const RestartHandler = require('./flow-control/restart-handler');

const getSpawnOpts = require('./get-spawn-opts');
const Command = require('./command');
const Logger = require('./logger');

const defaults = {
    spawn,
    raw: false,
    outputStream: process.stdout,
    restartDelay: 0,
    restartTries: 0,
    timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
};

module.exports = (commands, options) => {
    assert.ok(Array.isArray(commands), '[concurrently] commands should be an array');
    assert.notStrictEqual(commands.length, 0, '[concurrently] no commands provided');

    options = _.defaults(options, defaults);

    const commandParsers = [
        new StripQuotes(),
        new ExpandNpmShortcut(),
        new ExpandNpmWildcard()
    ];

    const spawnOpts = Object.assign(
        options.raw ? { stdio: 'inherit' } : {},
        getSpawnOpts()
    );

    commands = _(commands)
        .map(mapToCommandInfo)
        .flatMap(command => parseCommand(command, commandParsers))
        .map((command, index) => new Command({
            index,
            spawnOpts,
            spawn: options.spawn,
            info: command,
        }))
        .value();

    const logger = new Logger({
        outputStream: options.outputStream,
        prefixFormat: options.prefix,
        timestampFormat: options.timestampFormat,
    });

    [
        new OutputHandler(logger),
        new CloseHandler(logger),
        new RestartHandler({
            logger,
            delay: options.restartDelay,
            tries: options.restartTries,
        })
    ].forEach(controller => controller.handle(commands));

    commands.forEach(command => command.start());
};

function mapToCommandInfo(command) {
    return {
        command: command.command || command,
        name: command.name || '',
        prefixColor: command.prefixColor || '',
    };
}

function parseCommand(command, parsers) {
    return parsers.reduce(
        (commands, parser) => _.flatMap(commands, command => parser.parse(command)),
        _.castArray(command)
    );
}
