module.exports = class ExpandNpmShortcut {
    parse(commandInfo) {
        const [, cmdName, args] = commandInfo.command.match(/^npm:(\S+)(.*)/) || [];
        if (!cmdName) {
            return commandInfo;
        }

        return Object.assign({}, commandInfo, {
            name: commandInfo.name || cmdName,
            command: `npm run ${cmdName}${args}`
        });
    }
};
