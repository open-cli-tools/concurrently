import assert from 'assert';
import _ from 'lodash';
import { cpus } from 'os';
import { Writable } from 'stream';
import treeKill from 'tree-kill';

import {
    CloseEvent,
    Command,
    CommandIdentifier,
    CommandInfo,
    KillProcess,
    SpawnCommand,
} from './command';
import { CommandParser } from './command-parser/command-parser';
import { ExpandArguments } from './command-parser/expand-arguments';
import { ExpandMatrices } from './command-parser/expand-matrices';
import { ExpandShortcut } from './command-parser/expand-shortcut';
import { ExpandWildcard } from './command-parser/expand-wildcard';
import { StripQuotes } from './command-parser/strip-quotes';
import { CompletionListener, SuccessCondition } from './completion-listener';
import { FlowController } from './flow-control/flow-controller';
import { Logger } from './logger';
import { OutputWriter } from './output-writer';
import { PrefixColorSelector } from './prefix-color-selector';
import { getSpawnOpts, spawn } from './spawn';

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
export type ConcurrentlyCommandInput = string | ({ command: string } & Partial<CommandInfo>);

export type ConcurrentlyResult = {
    /**
     * All commands created and ran by concurrently.
     */
    commands: Command[];

    /**
     * A promise that resolves when concurrently ran successfully according to the specified
     * success condition, or reject otherwise.
     *
     * Both the resolved and rejected value is a list of all the close events for commands that
     * spawned; commands that didn't spawn are filtered out.
     */
    result: Promise<CloseEvent[]>;
};

export type ConcurrentlyOptions = {
    logger?: Logger;

    /**
     * Which stream should the commands output be written to.
     */
    outputStream?: Writable;

    /**
     * Whether the output should be ordered as if the commands were run sequentially.
     */
    group?: boolean;

    /**
     * A comma-separated list of chalk colors or a string for available styles listed below to use on prefixes.
     * If there are more commands than colors, the last color will be repeated.
     *
     * Available modifiers:
     * - `reset`, `bold`, `dim`, `italic`, `underline`, `inverse`, `hidden`, `strikethrough`
     *
     * Available colors:
     * - `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`,
     * any hex values for colors (e.g. `#23de43`) or `auto` for an automatically picked color
     *
     * Available background colors:
     * - `bgBlack`, `bgRed`, `bgGreen`, `bgYellow`, `bgBlue`, `bgMagenta`, `bgCyan`, `bgWhite`
     *
     * Set to `false` to disable colors.
     *
     * @see {@link https://www.npmjs.com/package/chalk} for more information.
     */
    prefixColors?: string | string[] | false;

    /**
     * Maximum number of commands to run at once.
     * Exact number or a percent of CPUs available (for example "50%").
     *
     * If undefined, then all processes will start in parallel.
     * Setting this value to 1 will achieve sequential running.
     */
    maxProcesses?: number | string;

    /**
     * Whether commands should be spawned in raw mode.
     * Defaults to false.
     */
    raw?: boolean;

    /**
     * Which commands should have their output hidden.
     */
    hide?: CommandIdentifier[];

    /**
     * The current working directory of commands which didn't specify one.
     * Defaults to `process.cwd()`.
     */
    cwd?: string;

    /**
     * @see CompletionListener
     */
    successCondition?: SuccessCondition;

    /**
     * A signal to stop spawning further processes.
     */
    abortSignal?: AbortSignal;

    /**
     * Which flow controllers should be applied on commands spawned by concurrently.
     * Defaults to an empty array.
     */
    controllers: FlowController[];

    /**
     * A function that will spawn commands.
     * Defaults to a function that spawns using either `cmd.exe` or `/bin/sh`.
     */
    spawn: SpawnCommand;

    /**
     * A function that will kill processes.
     * Defaults to the `tree-kill` module.
     */
    kill: KillProcess;

    /**
     * Signal to send to killed processes.
     */
    killSignal?: string;

    /**
     * Specify variables which will spawn multiple commands.
     */
    matrices?: readonly string[][];

    /**
     * List of additional arguments passed that will get replaced in each command.
     * If not defined, no argument replacing will happen.
     *
     * @see ExpandArguments
     */
    additionalArguments?: string[];
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

    const prefixColorSelector = new PrefixColorSelector(options.prefixColors || []);

    const commandParsers: CommandParser[] = [
        new StripQuotes(),
        new ExpandShortcut(),
        new ExpandWildcard(),
    ];

    if (options.matrices?.length) {
        commandParsers.push(new ExpandMatrices(options.matrices));
    }

    if (options.additionalArguments) {
        commandParsers.push(new ExpandArguments(options.additionalArguments));
    }

    const hide = (options.hide || []).map(String);
    let commands = _(baseCommands)
        .map(mapToCommandInfo)
        .flatMap((command) => parseCommand(command, commandParsers))
        .map((command, index) => {
            const hidden = hide.includes(command.name) || hide.includes(String(index));
            return new Command(
                {
                    index,
                    prefixColor: prefixColorSelector.getNextColor(),
                    ...command,
                },
                getSpawnOpts({
                    ipc: command.ipc,
                    stdio: hidden ? 'hidden' : command.raw ?? options.raw ? 'raw' : 'normal',
                    env: command.env,
                    cwd: command.cwd || options.cwd,
                }),
                options.spawn,
                options.kill,
            );
        })
        .value();

    const handleResult = options.controllers.reduce(
        ({ commands: prevCommands, onFinishCallbacks }, controller) => {
            const { commands, onFinish } = controller.handle(prevCommands);
            return {
                commands,
                onFinishCallbacks: _.concat(onFinishCallbacks, onFinish ? [onFinish] : []),
            };
        },
        { commands, onFinishCallbacks: [] } as {
            commands: Command[];
            onFinishCallbacks: (() => void)[];
        },
    );
    commands = handleResult.commands;

    if (options.logger && options.outputStream) {
        const outputWriter = new OutputWriter({
            outputStream: options.outputStream,
            group: !!options.group,
            commands,
        });
        options.logger.output.subscribe(({ command, text }) => outputWriter.write(command, text));
    }

    const commandsLeft = commands.slice();
    const maxProcesses = Math.max(
        1,
        (typeof options.maxProcesses === 'string' && options.maxProcesses.endsWith('%')
            ? Math.round((cpus().length * Number(options.maxProcesses.slice(0, -1))) / 100)
            : Number(options.maxProcesses)) || commandsLeft.length,
    );
    for (let i = 0; i < maxProcesses; i++) {
        maybeRunMore(commandsLeft, options.abortSignal);
    }

    const result = new CompletionListener({ successCondition: options.successCondition })
        .listen(commands, options.abortSignal)
        .finally(() => Promise.all(handleResult.onFinishCallbacks.map((onFinish) => onFinish())));

    return {
        result,
        commands,
    };
}

function mapToCommandInfo(command: ConcurrentlyCommandInput): CommandInfo {
    if (typeof command === 'string') {
        return mapToCommandInfo({ command });
    }

    assert.ok(command.command, '[concurrently] command cannot be empty');
    return {
        command: command.command,
        name: command.name || '',
        env: command.env || {},
        cwd: command.cwd || '',
        ipc: command.ipc,
        ...(command.prefixColor
            ? {
                  prefixColor: command.prefixColor,
              }
            : {}),
        ...(command.raw !== undefined
            ? {
                  raw: command.raw,
              }
            : {}),
    };
}

function parseCommand(command: CommandInfo, parsers: CommandParser[]) {
    return parsers.reduce(
        (commands, parser) => _.flatMap(commands, (command) => parser.parse(command)),
        _.castArray(command),
    );
}

function maybeRunMore(commandsLeft: Command[], abortSignal?: AbortSignal) {
    const command = commandsLeft.shift();
    if (!command || abortSignal?.aborted) {
        return;
    }

    command.start();
    command.close.subscribe(() => {
        maybeRunMore(commandsLeft, abortSignal);
    });
}
