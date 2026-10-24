import { quote as bashShellQuote } from 'shell-quote';

function contains(source: string, str: string) {
    for (let i = 0; i < str.length; i++) {
        if (source.includes(str.charAt(i))) {
            return true;
        }
    }
    return false;
}

function winShellQuote(args: string[]) {
    return args
        .map((arg) => {
            // Only process arguments containing double quotes or spaces.
            if (!contains(arg, '" ')) {
                return arg;
            }

            // Escape internal double quotes like " \" \\"
            const escaped: string = arg.replace(/\\*"/g, (match) => {
                const count: number = match.length - 1;
                return '\\'.repeat(count * 2 + 1) + '"';
            });

            // Wrap arguments containing spaces in double quotes
            if (contains(arg, ' ')) {
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

export const quote = (args: string[]) => {
    if (process.platform === 'win32') {
        return winShellQuote(args);
    }
    return bashShellQuote(args);
};
