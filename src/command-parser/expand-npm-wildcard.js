const _ = require('lodash');
const readPkg = require('read-pkg');

module.exports = class ExpandNpmWildcard {
    constructor(readPackage = readPkg.sync) {
        this.readPackage = readPackage;
    }

    parse(commandInfo) {
        const [, npmCmd, cmdName, args] = commandInfo.command.match(/(npm|yarn) run (\S+)([^&]*)/) || [];
        const wildcardPosition = (cmdName || '').indexOf('*');

        // If the regex didn't match an npm script, or it has no wildcard,
        // then we have nothing to do here
        if (!cmdName || wildcardPosition === -1) {
            return commandInfo;
        }

        if (!this.scripts) {
            this.scripts = Object.keys(this.readPackage().scripts || {});
        }

        const preWildcard = _.escapeRegExp(cmdName.substr(0, wildcardPosition));
        const postWildcard = _.escapeRegExp(cmdName.substr(wildcardPosition + 1));
        const wildcardRegex = new RegExp(`^${preWildcard}(.*?)${postWildcard}$`);

        return this.scripts
            .map(script => {
                const match = script.match(wildcardRegex);

                if (match) {
                    return Object.assign({}, commandInfo, {
                        command: `${npmCmd} run ${script}${args}`,
                        // Use the wildcard portion of the script match unless it's empty, 
                        // in which case use the full name of the script
                        name: match[1] || script
                    });
                }
            })
            .filter(Boolean);
    }
};
