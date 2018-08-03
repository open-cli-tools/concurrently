const assert = require('assert');
const _ = require('lodash');
const spawn = require('spawn-command');
const treeKill = require('tree-kill');

const StripQuotes = require('./command-parser/strip-quotes');
const ExpandNpmShortcut = require('./command-parser/expand-npm-shortcut');
const ExpandNpmWildcard = require('./command-parser/expand-npm-wildcard');

const CompletionListener = require('./flow-control/completion-listener');
const InputHandler = require('./flow-control/input-handler');
const KillOnSignal = require('./flow-control/kill-on-signal');
const LogError = require('./flow-control/log-error');
const LogExit = require('./flow-control/log-exit');
const LogOutput = require('./flow-control/log-output');
const KillOthers = require('./flow-control/kill-others');
const RestartProcess = require('./flow-control/restart-process');

const getSpawnOpts = require('./get-spawn-opts');
const Command = require('./command');
const Logger = require('./logger');

const defaults = {
    spawn,
    kill: treeKill,
    raw: false,
    killOthers: [],
    defaultInputTarget: 0,
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
        .map((command, index) => new Command(Object.assign({
            index,
            spawnOpts,
            killProcess: options.kill,
            spawn: options.spawn,
        }, command)))
        .value();

    const logger = new Logger({
        outputStream: options.outputStream,
        prefixFormat: options.prefix,
        raw: options.raw,
        timestampFormat: options.timestampFormat,
    });

    const controllerHandler = new CompletionListener({
        successCondition: options.successCondition,
        controllers: [
            new LogError(logger),
            new LogOutput(logger),
            new LogExit(logger),
            new InputHandler({
                logger,
                defaultInputTarget: options.defaultInputTarget,
                inputStream: options.inputStream,
            }),
            new KillOnSignal(),
            new KillOthers({
                logger,
                conditions: options.killOthers,
                restartTries: options.restartTries,
            }),
            new RestartProcess({
                logger,
                delay: options.restartDelay,
                tries: options.restartTries,
            })
        ]
    });

    commands.forEach(command => command.start());
    return controllerHandler.handle(commands);
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
