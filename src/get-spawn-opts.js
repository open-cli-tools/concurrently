const supportsColor = require('supports-color');

module.exports = ({
    colorSupport = supportsColor,
    isWindows = process.platform
} = {}) => Object.assign(
    {},
    isWindows && { detached: false },
    colorSupport && Object.assign({ FORCE_COLOR: colorSupport.level }, process.env)
);
