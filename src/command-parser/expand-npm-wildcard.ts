import fs from 'fs';
import _ from 'lodash';

import { CommandInfo } from '../command';
import { CommandParser } from './command-parser';

const OMISSION = /\(!([^)]+)\)/;

/**
 * Finds wildcards in npm/yarn/pnpm/bun run commands and replaces them with all matching scripts in the
 * `package.json` file of the current directory.
 */
export class ExpandNpmWildcard implements CommandParser {
    static readPackage() {
        try {
            const json = fs.readFileSync('package.json', { encoding: 'utf-8' });
            return JSON.parse(json);
        } catch (e) {
            return {};
        }
    }

    private scripts?: string[];

    constructor(private readonly readPackage = ExpandNpmWildcard.readPackage) {}

    parse(commandInfo: CommandInfo) {
        const [, npmCmd, runCmd, cmdName, args] =
            commandInfo.command.match(/(node|npm|yarn|pnpm|bun) ((?:--)?run) (\S+)([^&]*)/) || [];
        const wildcardPosition = (cmdName || '').indexOf('*');

        // If the regex didn't match an npm script, or it has no wildcard,
        // then we have nothing to do here
        if (!cmdName || wildcardPosition === -1) {
            return commandInfo;
        }

        if (!this.scripts) {
            this.scripts = Object.keys(this.readPackage().scripts || {});
        }

        const omissionRegex = cmdName.match(OMISSION);
        const cmdNameSansOmission = cmdName.replace(OMISSION, '');
        const preWildcard = _.escapeRegExp(cmdNameSansOmission.slice(0, wildcardPosition));
        const postWildcard = _.escapeRegExp(cmdNameSansOmission.slice(wildcardPosition + 1));
        const wildcardRegex = new RegExp(`^${preWildcard}(.*?)${postWildcard}$`);
        // If 'commandInfo.name' doesn't match 'cmdName', this means a custom name
        // has been specified and thus becomes the prefix (as described in the README).
        const prefix = commandInfo.name !== cmdName ? commandInfo.name : '';

        return this.scripts
            .map((script) => {
                const match = script.match(wildcardRegex);

                if (omissionRegex) {
                    const toOmit = script.match(new RegExp(omissionRegex[1]));

                    if (toOmit) {
                        return;
                    }
                }

                if (match) {
                    return {
                        ...commandInfo,
                        command: `${npmCmd} ${runCmd} ${script}${args}`,
                        // Will use an empty command name if no prefix has been specified and
                        // the wildcard match is empty, e.g. if `npm:watch-*` matches `npm run watch-`.
                        name: prefix + match[1],
                    };
                }
            })
            .filter((commandInfo): commandInfo is CommandInfo => !!commandInfo);
    }
}
