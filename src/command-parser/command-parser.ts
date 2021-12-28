import { CommandInfo } from '../command';

export interface CommandParser {
    parse(commandInfo: CommandInfo): CommandInfo | CommandInfo[];
}
