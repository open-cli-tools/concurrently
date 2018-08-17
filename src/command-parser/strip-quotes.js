module.exports = class StripQuotes {
    parse(commandInfo) {
        let { command } = commandInfo;

        // Removes the quotes surrounding a command.
        if (command[0] === '"' || command[0] === '\'') {
            command = command.substr(1, command.length - 2);
        }

        return Object.assign({}, commandInfo, { command });
    }
};
