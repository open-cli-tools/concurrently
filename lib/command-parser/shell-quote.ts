import { quote as bashShellQuote } from 'shell-quote';

import { isWinShellKind, ShellKind } from '../spawn.js';

function winShellQuote(args: string[]) {
    return args
        .map((arg) => {
            // Only process arguments containing double quotes or spaces.
            if (!/["\s]/.test(arg)) {
                return arg;
            }

            // Escape internal double quotes like " \" \\"
            const escaped: string = arg.replace(/\\*"/g, (match) => {
                const count: number = match.length - 1;
                return '\\'.repeat(count * 2 + 1) + '"';
            });

            // Wrap arguments containing spaces in double quotes
            if (/[\s]/.test(arg)) {
                // Escape trailing backslashes before the closing quote
                const match = escaped.match(/\\+$/);
                if (match && match[0].length % 2 === 1) {
                    return '"' + escaped + '\\"';
                }
                return '"' + escaped + '"';
            }
            return escaped;
        })
        .join(' ');
}

export const createShellQuote = (shellKind: ShellKind) => {
    if (isWinShellKind(shellKind)) {
        return winShellQuote;
    }
    return bashShellQuote;
};
