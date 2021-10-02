import * as assert from 'assert';
import _ from 'lodash';
import spawn from 'spawn-command';
import treeKill from 'tree-kill';

import { StripQuotes } from './command-parser/strip-quotes';
import { ExpandNpmShortcut } from './command-parser/expand-npm-shortcut';
import { ExpandNpmWildcard } from './command-parser/expand-npm-wildcard';

import { CompletionListener } from './completion-listener';

import { getSpawnOpts } from './get-spawn-opts';
import { CommandImpl } from './command';

const defaults = {
    spawn,
    kill: treeKill,
    raw: false,
    controllers: [],
    cwd: undefined,
};

export function concurrently(commands, options) {
    assert.ok(Array.isArray(commands), '[concurrently] commands should be an array');
    assert.notStrictEqual(commands.length, 0, '[concurrently] no commands provided');

    options = _.defaults(options, defaults);

    const commandParsers = [
        new StripQuotes(),
        new ExpandNpmShortcut(),
        new ExpandNpmWildcard()
    ];

    let lastColor = '';
    commands = _(commands)
        .map(mapToCommandInfo)
        .flatMap(command => parseCommand(command, commandParsers))
        .map((command, index) => {
            // Use documented behaviour of repeating last color when specifying more commands than colors
            lastColor = options.prefixColors && options.prefixColors[index] || lastColor;
            return new CommandImpl(
                Object.assign({
                    index,
                    spawnOpts: getSpawnOpts({
                        raw: options.raw,
                        env: command.env,
                        cwd: command.cwd || options.cwd,
                    }),
                    prefixColor: lastColor,
                    killProcess: options.kill,
                    spawn: options.spawn,
                }, command)
            );
        })
        .value();

    const handleResult = options.controllers.reduce(
        ({ commands: prevCommands, onFinishCallbacks }, controller) => {
            const { commands, onFinish } = controller.handle(prevCommands);
            return {
                commands,
                onFinishCallbacks: _.concat(onFinishCallbacks, onFinish ? [onFinish] : [])
            };
        },
        { commands, onFinishCallbacks: [] }
    );
    commands = handleResult.commands;

    const commandsLeft = commands.slice();
    const maxProcesses = Math.max(1, Number(options.maxProcesses) || commandsLeft.length);
    for (let i = 0; i < maxProcesses; i++) {
        maybeRunMore(commandsLeft);
    }

    return new CompletionListener({ successCondition: options.successCondition })
        .listen(commands)
        .finally(() => {
            handleResult.onFinishCallbacks.forEach((onFinish) => onFinish());
        });
}

function mapToCommandInfo(command) {
    return Object.assign({
        command: command.command || command,
        name: command.name || '',
        env: command.env || {},
        cwd: command.cwd || '',
    }, command.prefixColor ? {
        prefixColor: command.prefixColor,
    } : {});
}

function parseCommand(command, parsers) {
    return parsers.reduce(
        (commands, parser) => _.flatMap(commands, command => parser.parse(command)),
        _.castArray(command)
    );
}

function maybeRunMore(commandsLeft) {
    const command = commandsLeft.shift();
    if (!command) {
        return;
    }

    command.start();
    command.close.subscribe(() => {
        maybeRunMore(commandsLeft);
    });
}
