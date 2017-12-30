"use strict";

module.exports = function (cmds, config) {
    config = config || {};

    let names = (config.names || '').split(config.nameSeparator || ',');
    let prefixColors = config.prefixColors ? config.prefixColors.split(',') : [];

    cmds = cmds.map(stripCmdQuotes);

    cmds = cmds.map((cmd, idx) => ({
        cmd: cmd,
        name: names[idx] || '',
        color: prefixColors[idx]
    }));

    cmds = [].concat(...cmds.map(expandCmdShortcuts));

    return cmds;
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
        cmd.cmd = `npm run ${shortcut[1]}${shortcut[2]}`;

        if (!cmd.name) {
            cmd.name = shortcut[1];
        }
    }
    return [ cmd ];
}
