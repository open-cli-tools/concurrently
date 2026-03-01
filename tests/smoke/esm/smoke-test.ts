import concurrently, {
    concurrently as concurrently2,
    type ConcurrentlyResult,
    createConcurrently,
} from 'concurrently';

const _result: ConcurrentlyResult = concurrently(['echo test'], {
    raw: true,
});

const _result2: ConcurrentlyResult = concurrently2(['echo test'], {
    killOthersOn: ['failure'],
});

const _result3: ConcurrentlyResult = createConcurrently(['echo test'], {
    successCondition: 'all',
});
