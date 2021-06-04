module.exports = class StripQuotes {
    parse(commandInfo) {
        let { command, argPend } = commandInfo;
        if(!argPend) {
            return commandInfo
        }

        const argPrepend = argPend.prepend ? (argPend.prepend + " ") : ""
        const argAppend = argPend.append ? (" " + argPend.append) : ""
        if (argPrepend == "" && argAppend == "") {
            return commandInfo
        }

        command = argPrepend + command + argAppend
        return Object.assign({}, commandInfo, { command });
    }
};
