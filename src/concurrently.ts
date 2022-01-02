import assert from 'assert';
import _ from 'lodash';
import spawn from 'spawn-command';
import { Writable } from 'stream';
import treeKill from 'tree-kill';
import { CloseEvent, Command, CommandInfo, KillProcess, SpawnCommand } from './command';
import { CommandParser } from './command-parser/command-parser';
import { ExpandNpmShortcut } from './command-parser/expand-npm-shortcut';
import { ExpandNpmWildcard } from './command-parser/expand-npm-wildcard';
import { StripQuotes } from './command-parser/strip-quotes';
import { CompletionListener, SuccessCondition } from './completion-listener';
import { FlowController } from './flow-control/flow-controller';
import { getSpawnOpts } from './get-spawn-opts';
import { Logger } from './logger';
import { OutputWriter } from './output-writer';

const defaults: ConcurrentlyOptions = {
    spawn,
    kill: treeKill,
    raw: false,
    controllers: [],
    cwd: undefined,
};

/**
 * A command that is to be passed into `concurrently()`.
 * If value is a string, then that's the command's command line.
 * Fine grained options can be defined by using the object format.
 */
export type ConcurrentlyCommandInput = string | Partial<CommandInfo>;

export type ConcurrentlyResult = {
    /**
     * All commands created and ran by concurrently.
     */
     commands: Command[],

    /**
     * A promise that resolves when concurrently ran successfully according to the specified
     * success condition, or reject otherwise.
     *
     * Both the resolved and rejected value is the list of all command's close events.
     */
    result: Promise<CloseEvent[]>,
};

export type ConcurrentlyOptions = {
    logger?: Logger,

    /**
     * Which stream should the commands output be written to.
     */
    outputStream?: Writable,
    group?: boolean,
    prefixColors?: string[],

    /**
     * Maximum number of commands to run at once.
     *
     * If undefined, then all processes will start in parallel.
     * Setting this value to 1 will achieve sequential running.
     */
    maxProcesses?: number,

    /**
     * Whether commands should be spawned in raw mode.
     * Defaults to false.
     */
    raw?: boolean,

    /**
     * The current working directory of commands which didn't specify one.
     * Defaults to `process.cwd()`.
     */
    cwd?: string,

    /**
     * @see CompletionListener
     */
    successCondition?: SuccessCondition,

    /**
     * Which flow controllers should be applied on commands spawned by concurrently.
     * Defaults to an empty array.
     */
    controllers: FlowController[],

    /**
     * A function that will spawn commands.
     * Defaults to the `spawn-command` module.
     */
    spawn: SpawnCommand,

    /**
     * A function that will kill processes.
     * Defaults to the `tree-kill` module.
     */
    kill: KillProcess,
};

/**
 * Core concurrently functionality -- spawns the given commands concurrently and
 * returns the commands themselves + the result according to the specified success condition.
 *
 * @see CompletionListener
 */
export function concurrently(
    baseCommands: ConcurrentlyCommandInput[],
    baseOptions?: Partial<ConcurrentlyOptions>,
): ConcurrentlyResult {
    assert.ok(Array.isArray(baseCommands), '[concurrently] commands should be an array');
    assert.notStrictEqual(baseCommands.length, 0, '[concurrently] no commands provided');

    const options = _.defaults(baseOptions, defaults);

    const commandParsers: CommandParser[] = [
        new StripQuotes(),
        new ExpandNpmShortcut(),
        new ExpandNpmWildcard()
    ];

    let lastColor = '';
    let commands = _(baseCommands)
        .map(mapToCommandInfo)
        .flatMap(command => parseCommand(command, commandParsers))
        .map((command, index) => {
            // Use documented behaviour of repeating last color when specifying more commands than colors
            lastColor = options.prefixColors && options.prefixColors[index] || lastColor;
            return new Command(Object.assign({
                index,
                prefixColor: lastColor,
            }, command), getSpawnOpts({
                raw: options.raw,
                env: command.env,
                cwd: command.cwd || options.cwd,
            }), options.spawn, options.kill);
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


    if (options.logger) {
        const outputWriter = new OutputWriter({
            outputStream: options.outputStream,
            group: options.group,
            commands,
        });
        options.logger.output.subscribe(({command, text}) => outputWriter.write(command, text));
    }

    const commandsLeft = commands.slice();
    const maxProcesses = Math.max(1, Number(options.maxProcesses) || commandsLeft.length);
    for (let i = 0; i < maxProcesses; i++) {
        maybeRunMore(commandsLeft);
    }

    const result = new CompletionListener({ successCondition: options.successCondition })
        .listen(commands)
        .finally(() => {
            handleResult.onFinishCallbacks.forEach((onFinish) => onFinish());
        });

    return {
        result,
        commands,
    };
};

function mapToCommandInfo(command: ConcurrentlyCommandInput): CommandInfo {
    if (typeof command === 'string') {
        return {
            command,
            name: '',
            env: {},
            cwd: '',
        };
    }

    return Object.assign({
        command: command.command,
        name: command.name || '',
        env: command.env || {},
        cwd: command.cwd || '',
    }, command.prefixColor ? {
        prefixColor: command.prefixColor,
    } : {});
}

function parseCommand(command: CommandInfo, parsers: CommandParser[]) {
    return parsers.reduce(
        (commands, parser) => _.flatMap(commands, command => parser.parse(command)),
        _.castArray(command)
    );
}

function maybeRunMore(commandsLeft: Command[]) {
    const command = commandsLeft.shift();
    if (!command) {
        return;
    }

    command.start();
    command.close.subscribe(() => {
        maybeRunMore(commandsLeft);
    });
}
