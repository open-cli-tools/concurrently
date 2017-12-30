"use strict";

module.exports = function (cmds, config) {
    config = config || {};

    let names = (config.names || '').split(config.nameSeparator || ',');
    let prefixColors = config.prefixColors ? config.prefixColors.split(',') : [];

    cmds = cmds.map(stripCmdQuotes);
    cmds = cmds.map((cmd, idx) => {
        return expandCmdShortcuts(cmd, idx, names);
    });

    return cmds.map((cmd, idx) => ({
        cmd: cmd,
        name: names[idx] || '',
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

function expandCmdShortcuts(cmd, idx, names) {
    let shortcut = cmd.match(/^npm:(\S+)(.*)/);
    if (shortcut) {
        if (!names[idx]) {
            names[idx] = shortcut[1];
        }
        return `npm run ${shortcut[1]}${shortcut[2]}`;
    }

    return cmd;
}
