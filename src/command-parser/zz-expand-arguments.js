module.exports = class StripQuotes {
    parse(commandInfo) {
        let { command } = commandInfo;
        const { argPend } = commandInfo;
        if (!argPend || !argPend.definition) {
            return commandInfo;
        }

        const argPrepend = argPend.definition.prepend ? (argPend.definition.prepend + ' ') : '';
        const argAppend = argPend.definition.append ? (' ' + argPend.definition.append) : '';
        if (argPrepend === '' && argAppend === '') {
            return commandInfo;
        }

        command = argPrepend + command + argAppend;
        return Object.assign({}, commandInfo, { command });
    }
};
