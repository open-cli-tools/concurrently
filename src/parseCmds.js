'use strict';
const _ = require('lodash');

const pkgInfo = require('./pkgInfo');

module.exports = function (cmds, config) {
    config = config || {};

    let names = (config.names || '').split(config.nameSeparator || ',');
    let prefixColors = config.prefixColors ? config.prefixColors.split(',') : [];

    cmds = cmds.map(stripCmdQuotes);

    cmds = cmds.map((cmd, idx) => ({
        cmd: cmd,
        name: names[idx] || ''
    }));

    cmds = _.flatMap(cmds, expandCmdShortcuts);

    return cmds.map((cmd, idx) => Object.assign(cmd, {
        color: prefixColors[idx]
    }));
}

function stripCmdQuotes(cmd) {
    // Removes the quotes surrounding a command.
    if (cmd[0] === '"' || cmd[0] === '\'') {
        return cmd.substr(1, cmd.length - 2);
    } else {
        return cmd;
    }
}

function expandCmdShortcuts(cmd) {
    let shortcut = cmd.cmd.match(/^npm:(\S+)(.*)/);
    if (shortcut) {
        let cmdName = shortcut[1];
        let args = shortcut[2];

        let wildcard = cmdName.indexOf('*');
        if (wildcard >= 0) {
            return expandNpmWildcard(cmd, cmdName, wildcard, args);
        }

        if (!cmd.name) {
            cmd.name = cmdName;
        }
        cmd.cmd = `npm run ${cmdName}${args}`;
    }
    return [ cmd ];
}

function expandNpmWildcard(cmd, cmdName, wildcardPos, args) {
    let rePre = _.escapeRegExp(cmdName.substr(0, wildcardPos));
    let reSuf = _.escapeRegExp(cmdName.substr(wildcardPos + 1));
    let wildcardRe = new RegExp(`^${rePre}(.*?)${reSuf}$`);

    return pkgInfo.getScripts()
        .filter(script => script.match(wildcardRe))
        .map(script => Object.assign({}, cmd,  {
            cmd: `npm run ${script}${args}`,
            name: cmd.name + script.match(wildcardRe)[1]
        }));
}
