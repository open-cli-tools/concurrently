export function normalizeCliCommand(command: string): string {
    if (/^".+?"$/.test(command) || /^'.+?'$/.test(command)) {
        return command.slice(1, command.length - 1);
    }

    return command;
}
