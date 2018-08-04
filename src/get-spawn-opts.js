const supportsColor = require('supports-color');

module.exports = ({
    colorSupport = supportsColor,
    process = global.process
} = {}) => Object.assign(
    {},
    /^win/.test(process.platform) && { detached: false },
    colorSupport && { env: Object.assign({ FORCE_COLOR: colorSupport.level }, process.env) }
);
