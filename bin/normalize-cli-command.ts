export function normalizeCliCommand(command: string): string {
    if (command.length < 2) {
        return command;
    }

    const quote = command[0];
    const last = command[command.length - 1];
    if ((quote !== '"' && quote !== "'") || last !== quote) {
        return command;
    }

    const inner = command.slice(1, -1);
    if (inner.includes(quote)) {
        return command;
    }

    return inner;
}
