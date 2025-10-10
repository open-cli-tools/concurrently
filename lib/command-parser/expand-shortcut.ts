import { CommandInfo } from '../command.js';
import { CommandParser } from './command-parser.js';

/**
 * Expands shortcuts according to the following table:
 *
 * | Syntax          | Expands to            |
 * | --------------- | --------------------- |
 * | `npm:<script>`  | `npm run <script>`    |
 * | `pnpm:<script>` | `pnpm run <script>`   |
 * | `yarn:<script>` | `yarn run <script>`   |
 * | `bun:<script>`  | `bun run <script>`    |
 * | `node:<script>` | `node --run <script>` |
 * | `deno:<script>` | `deno task <script>`  |
 */
export class ExpandShortcut implements CommandParser {
    parse(commandInfo: CommandInfo) {
        const [, prefix, script, args] =
            /^(npm|yarn|pnpm|bun|node|deno):(\S+)(.*)/.exec(commandInfo.command) || [];
        if (!script) {
            return commandInfo;
        }

        let command: string;
        if (prefix === 'node') {
            command = 'node --run';
        } else if (prefix === 'deno') {
            command = 'deno task';
        } else {
            command = `${prefix} run`;
        }

        return {
            ...commandInfo,
            name: commandInfo.name || script,
            command: `${command} ${script}${args}`,
        };
    }
}
