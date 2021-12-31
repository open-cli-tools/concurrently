//
// While in local development, make sure you've run `npm run build` first.
//

const concurrently = require('./dist/src/index.js');
module.exports = exports = concurrently.default;
Object.assign(exports, concurrently);
