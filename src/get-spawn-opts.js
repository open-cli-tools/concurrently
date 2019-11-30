const supportsColor = require('supports-color');

module.exports = ({
    colorSupport = supportsColor.stdout,
    process = global.process,
    raw = false
} = {}) => Object.assign(
    {},
    raw && { stdio: 'inherit' },
    /^win/.test(process.platform) && { detached: false },
    colorSupport && { env: Object.assign({ FORCE_COLOR: colorSupport.level }, process.env) }
);
