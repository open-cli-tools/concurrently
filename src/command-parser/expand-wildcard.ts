import fs from 'fs';
import _ from 'lodash';

import { CommandInfo } from '../command';
import { CommandParser } from './command-parser';

// Matches a negative filter surrounded by '(!' and ')'.
const OMISSION = /\(!([^)]+)\)/;

/**
 * Finds wildcards in 'npm/yarn/pnpm/bun run', 'node --run' and 'deno task'
 * commands and replaces them with all matching scripts in the `package.json`
 * and `deno.json` files of the current directory.
 */
export class ExpandWildcard implements CommandParser {
    static readDeno() {
        try {
            const json = fs.readFileSync('deno.json', { encoding: 'utf-8' });
            return JSON.parse(json);
        } catch (e) {
            return {};
        }
    }

    static readPackage() {
        try {
            const json = fs.readFileSync('package.json', { encoding: 'utf-8' });
            return JSON.parse(json);
        } catch (e) {
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
        const [, command, scriptGlob, args] =
            /((?:npm|yarn|pnpm|bun) (?:run)|node --run|deno task) (\S+)([^&]*)/.exec(
                commandInfo.command,
            ) || [];

        const wildcardPosition = (scriptGlob || '').indexOf('*');

        // If the regex didn't match an npm script, or it has no wildcard,
        // then we have nothing to do here
        if (wildcardPosition === -1) {
            return commandInfo;
        }

        const [, omission] = OMISSION.exec(scriptGlob) || [];
        const scriptGlobSansOmission = scriptGlob.replace(OMISSION, '');
        const preWildcard = _.escapeRegExp(scriptGlobSansOmission.slice(0, wildcardPosition));
        const postWildcard = _.escapeRegExp(scriptGlobSansOmission.slice(wildcardPosition + 1));
        const wildcardRegex = new RegExp(`^${preWildcard}(.*?)${postWildcard}$`);
        // If 'commandInfo.name' doesn't match 'scriptGlob', this means a custom name
        // has been specified and thus becomes the prefix (as described in the README).
        const prefix = commandInfo.name !== scriptGlob ? commandInfo.name : '';

        return this.relevantScripts(command)
            .map((script) => {
                if (omission && RegExp(omission).test(script)) {
                    return;
                }

                const [, match] = wildcardRegex.exec(script) || [];
                if (match !== undefined) {
                    return {
                        ...commandInfo,
                        command: `${command} ${script}${args}`,
                        // Will use an empty command name if no prefix has been specified and
                        // the wildcard match is empty, e.g. if `npm:watch-*` matches `npm run watch-`.
                        name: prefix + match,
                    };
                }
            })
            .filter((commandInfo): commandInfo is CommandInfo => !!commandInfo);
    }
}
