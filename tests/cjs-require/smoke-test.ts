// eslint-disable-next-line @typescript-eslint/no-require-imports
import concurrently = require('concurrently');

const { concurrently: concurrently2, createConcurrently } = concurrently;

const _result: concurrently.ConcurrentlyResult = concurrently.default(['echo test'], {
    raw: true,
});

const _result2: concurrently.ConcurrentlyResult = concurrently2(['echo test'], {
    killOthersOn: ['failure'],
});

const _result3: concurrently.ConcurrentlyResult = createConcurrently(['echo test'], {
    successCondition: 'all',
});
