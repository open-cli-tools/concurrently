/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ConcurrentlyResult } from 'concurrently';
import concurrently, { concurrently as concurrently2, createConcurrently } from 'concurrently';

const result: ConcurrentlyResult = concurrently(['echo test'], {
    raw: true,
});

const result2: ConcurrentlyResult = concurrently2(['echo test'], {
    killOthersOn: ['failure'],
});

const result3: ConcurrentlyResult = createConcurrently(['echo test'], {
    successCondition: 'all',
});
