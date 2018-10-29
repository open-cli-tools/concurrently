module.exports = class ExpandNpmShortcut {
    parse(commandInfo) {
        const [, npmCmd, cmdName, args] = commandInfo.command.match(/^(npm|yarn):(\S+)(.*)/) || [];
        if (!cmdName) {
            return commandInfo;
        }

        return Object.assign({}, commandInfo, {
            name: commandInfo.name || cmdName,
            command: `${npmCmd} run ${cmdName}${args}`
        });
    }
};
