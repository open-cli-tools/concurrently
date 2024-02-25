/* eslint-disable @typescript-eslint/no-unused-vars */

import concurrently = require('concurrently');

const { concurrently: concurrently2, createConcurrently } = concurrently;

const result: concurrently.ConcurrentlyResult = concurrently(['ls'], {
    raw: true,
});

const result2: concurrently.ConcurrentlyResult = concurrently2(['ls'], {
    killOthers: ['failure'],
});

const result3: concurrently.ConcurrentlyResult = createConcurrently(['ls'], {
    successCondition: 'all',
});
