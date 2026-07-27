import fs from 'node:fs';

import { parse as parseShell } from 'unbash';

import { CommandInfo } from '../command.js';
import JSONC from '../jsonc.js';
import { escapeRegExp } from '../utils.js';
import { CommandParser } from './command-parser.js';

// Matches a negative filter surrounded by '(!' and ')'.
const OMISSION = /\(!([^)]+)\)/;

// The subcommand that makes each runner take a script name.
const RUN_SUBCOMMANDS: Record<string, string> = {
    npm: 'run',
    yarn: 'run',
    pnpm: 'run',
    bun: 'run',
    node: '--run',
    deno: 'task',
};

type Word = { value: string; pos: number; end: number };
type Runner = { command: string; glob: Word };

/**
 * Finds the first '<runner> <subcommand> <script>' invocation in a parsed command.
 *
 * Reading this from the syntax tree rather than the raw text means anything else
 * in the command line keeps its exact source text, and a runner named inside a
 * quoted argument is not mistaken for one.
 */
function findRunner(node: unknown): Runner | undefined {
    if (!node || typeof node !== 'object') {
        return undefined;
    }

    const candidate = node as { type?: string; name?: Word; suffix?: Word[] };
    if (candidate.type === 'Command') {
        const name = candidate.name?.value;
        const [subcommand, glob] = candidate.suffix ?? [];
        if (name && glob && subcommand?.value === RUN_SUBCOMMANDS[name]) {
            return { command: `${name} ${subcommand.value}`, glob };
        }
    }

    for (const value of Object.values(candidate)) {
        const found = findRunner(value);
        if (found) {
            return found;
        }
    }
    return undefined;
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
            const json = fs.readFileSync('package.json', { encoding: 'utf-8' });
            return JSON.parse(json);
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
        // We expect one of the following patterns:
        // - <npm|yarn|pnpm|bun> run <script> [args]
        // - node --run <script> [args]
        // - deno task <script> [args]
        const runner = findRunner(parseShell(commandInfo.command));
        const scriptGlob = runner?.glob.value ?? '';
        const wildcardPosition = scriptGlob.indexOf('*');

        // If no runner invocation was found, or its script has no wildcard,
        // then we have nothing to do here
        if (!runner || wildcardPosition === -1) {
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

        for (const script of this.relevantScripts(runner.command)) {
            if (omission && new RegExp(omission).test(script)) {
                continue;
            }

            const result = wildcardRegex.exec(script);
            const match = result?.[1];
            if (match !== undefined) {
                commands.push({
                    ...commandInfo,
                    // Substitute the script in place so the rest of the command
                    // line, including anything chained after it, is preserved.
                    command:
                        commandInfo.command.slice(0, runner.glob.pos) +
                        script +
                        commandInfo.command.slice(runner.glob.end),
                    // Will use an empty command name if no prefix has been specified and
                    // the wildcard match is empty, e.g. if `npm:watch-*` matches `npm run watch-`.
                    name: prefix + match,
                });
            }
        }

        return commands;
    }
}
