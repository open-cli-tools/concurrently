/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ConcurrentlyResult } from 'concurrently';
import concurrently, { concurrently as concurrently2, createConcurrently } from 'concurrently';

const result: ConcurrentlyResult = concurrently(['ls'], {
    raw: true,
});

const result2: ConcurrentlyResult = concurrently2(['ls'], {
    killOthers: ['failure'],
});

const result3: ConcurrentlyResult = createConcurrently(['ls'], {
    successCondition: 'all',
});
