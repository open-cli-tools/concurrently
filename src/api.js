var _ = require('lodash');
var lib = require('./lib.js');

module.exports = function(commands, options) {
    const prefixColors = [];
    const names = [];
    const executables = [];
    _.each(commands, cmd => {
        if (typeof cmd === 'string') {
            prefixColors.push('');
            names.push('');
            executables.push(cmd);
        } else {
            const cmdColors = _.filter([cmd.prefixModifier, cmd.prefixTextColor, cmd.prefixBackColor], o => o);
            prefixColors.push(cmdColors.length > 0 ? _.join(cmdColors, '.') : '');
            names.push(cmd.name || '');
            executables.push(cmd.command);
        }
    });

    _.assign(lib.config, options);

    return new Promise(resolve => {
        lib.run(executables, names, prefixColors, childExitCodes => {
            resolve(childExitCodes);
        });
    });
}