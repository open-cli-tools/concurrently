const assert = require('assert');
const _ = require('lodash');
const spawn = require('spawn-command');
const treeKill = require('tree-kill');

const StripQuotes = require('./command-parser/strip-quotes');
const ExpandNpmShortcut = require('./command-parser/expand-npm-shortcut');
const ExpandNpmWildcard = require('./command-parser/expand-npm-wildcard');

const CompletionListener = require('./flow-control/completion-listener');

const getSpawnOpts = require('./get-spawn-opts');
const Command = require('./command');

const defaults = {
    spawn,
    kill: treeKill,
    raw: false,
    controllers: []
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

    const controllerHandler = new CompletionListener({
        successCondition: options.successCondition,
        controllers: options.controllers
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
