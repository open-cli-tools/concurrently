const concurrently = require('./concurrently');
concurrently(['npm:echo-*', 'npm:echo']);
