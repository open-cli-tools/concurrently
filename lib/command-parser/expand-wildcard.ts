import fs from 'node:fs';

import { type Node, parse as parseShell, type Script, type Word } from 'unbash';

import { CommandInfo } from '../command.js';
import JSONC from '../jsonc.js';
import { escapeRegExp } from '../utils.js';
import { CommandParser } from './command-parser.js';

// Matches a negative filter surrounded by '(!' and ')'.
const OMISSION = /\(!([^)]+)\)/;

const RUN_SUBCOMMANDS: Record<string, string> = {
    npm: 'run',
    yarn: 'run',
    pnpm: 'run',
    bun: 'run',
    node: '--run',
    deno: 'task',
};

type WildcardCommand = {
    command: string;
    scriptGlob: string;
    replace: (script: string) => string;
};

function findRunner(node: Node | Script): { command: string; glob: Word } | undefined {
    switch (node.type) {
        case 'Command': {
            const words = [node.name, ...node.suffix];
            for (let index = 0; index + 2 < words.length; index++) {
                const name = words[index]?.value;
                const subcommand = words[index + 1];
                const glob = words[index + 2];
                if (
                    name &&
                    glob &&
                    subcommand?.value === RUN_SUBCOMMANDS[name] &&
                    glob.value.includes('*')
                ) {
                    return {
                        command: `${name} ${subcommand.value}`,
                        glob,
                    };
                }
            }
            return undefined;
        }
        case 'Statement':
            return findRunner(node.command);
        case 'Script':
        case 'Pipeline':
        case 'AndOr':
            for (const command of node.commands) {
                const runner = findRunner(command);
                if (runner) {
                    return runner;
                }
            }
            return undefined;
        default:
            return undefined;
    }
}

function quoteScript(script: string): string {
    if (script.includes('\0')) {
        throw new TypeError('Arguments cannot contain NUL');
    }
    return /^[\p{L}\p{N}_:./+-][\p{L}\p{N}_:@./+-]*$/u.test(script)
        ? script
        : "'" + script.split("'").join("'\\''") + "'";
}

function parseCommand(commandLine: string): WildcardCommand | undefined {
    let parsed = parseShell(commandLine);
    let runner = findRunner(parsed);
    if (!runner) {
        return undefined;
    }
    const omission = OMISSION.exec(commandLine.slice(runner.glob.end));
    let addedQuoteLength = 0;
    if (omission?.index === 0) {
        // Quote concurrently's omission syntax so the parser includes any following word suffix.
        const quotedOmission = quoteScript(omission[0]);
        parsed = parseShell(
            commandLine.slice(0, runner.glob.end) +
                quotedOmission +
                commandLine.slice(runner.glob.end + omission[0].length),
        );
        runner = findRunner(parsed);
        if (!runner) {
            return undefined;
        }
        addedQuoteLength = quotedOmission.length - omission[0].length;
    }
    const { command, glob } = runner;
    if (parsed.errors?.some((error) => error.pos >= glob.pos && error.pos < glob.end)) {
        return undefined;
    }
    const end = glob.end - addedQuoteLength;
    return {
        command,
        scriptGlob: glob.value,
        replace: (script) =>
            commandLine.slice(0, glob.pos) + quoteScript(script) + commandLine.slice(end),
    };
}

/**
 * Finds wildcards in 'npm/yarn/pnpm/bun run', 'node --run' and 'deno task'
 * commands and replaces them with all matching scripts in the NodeJS and Deno
 * configuration files of the current directory.
 */
export class ExpandWildcard implements CommandParser {
    static readDeno() {
        try {
            let json: string = '{}';

            if (fs.existsSync('deno.json')) {
                json = fs.readFileSync('deno.json', { encoding: 'utf-8' });
            } else if (fs.existsSync('deno.jsonc')) {
                json = fs.readFileSync('deno.jsonc', { encoding: 'utf-8' });
            }

            return JSONC.parse(json);
        } catch {
            return {};
        }
    }

    static readPackage() {
        try {
            let json: string = '{}';

            if (fs.existsSync('package.json')) {
                json = fs.readFileSync('package.json', { encoding: 'utf-8' });
            } else if (fs.existsSync('package.json5')) {
                json = fs.readFileSync('package.json5', { encoding: 'utf-8' });
            }

            return JSONC.parse(json);
        } catch {
            return {};
        }
    }

    private packageScripts?: string[];
    private denoTasks?: string[];

    constructor(
        private readonly readDeno = ExpandWildcard.readDeno,
        private readonly readPackage = ExpandWildcard.readPackage,
    ) {}

    private relevantScripts(command: string): string[] {
        if (!this.packageScripts) {
            this.packageScripts = Object.keys(this.readPackage().scripts || {});
        }

        if (command === 'deno task') {
            if (!this.denoTasks) {
                // If Deno tries to run a task that doesn't exist,
                // it can fall back to running a script with the same name.
                // Therefore, the actual list of tasks is the union of the tasks and scripts.
                this.denoTasks = [
                    ...Object.keys(this.readDeno().tasks || {}),
                    ...this.packageScripts,
                ];
            }

            return this.denoTasks;
        }

        return this.packageScripts;
    }

    parse(commandInfo: CommandInfo) {
        const wildcard = parseCommand(commandInfo.command);
        if (!wildcard) {
            return commandInfo;
        }
        const { command, scriptGlob, replace } = wildcard;
        const wildcardPosition = scriptGlob.indexOf('*');
        if (wildcardPosition === -1) {
            return commandInfo;
        }

        const [, omission] = OMISSION.exec(scriptGlob) || [];
        const scriptGlobSansOmission = scriptGlob.replace(OMISSION, '');
        const preWildcard = escapeRegExp(scriptGlobSansOmission.slice(0, wildcardPosition));
        const postWildcard = escapeRegExp(scriptGlobSansOmission.slice(wildcardPosition + 1));
        const wildcardRegex = new RegExp(`^${preWildcard}(.*?)${postWildcard}$`);
        // If 'commandInfo.name' doesn't match 'scriptGlob', this means a custom name
        // has been specified and thus becomes the prefix (as described in the README).
        const prefix = commandInfo.name !== scriptGlob ? commandInfo.name : '';

        const commands: CommandInfo[] = [];

        for (const script of this.relevantScripts(command)) {
            if (omission && new RegExp(omission).test(script)) {
                continue;
            }

            const result = wildcardRegex.exec(script);
            const match = result?.[1];
            if (match !== undefined) {
                commands.push({
                    ...commandInfo,
                    command: replace(script),
                    // Will use an empty command name if no prefix has been specified and
                    // the wildcard match is empty, e.g. if `npm:watch-*` matches `npm run watch-`.
                    name: prefix + match,
                });
            }
        }

        return commands;
    }
}
