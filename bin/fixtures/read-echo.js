/* eslint-disable no-console */

process.on('SIGINT', () => {
    console.log('Received SIGINT');
    process.exit(0);
});

process.stdin.on('data', (chunk) => {
    const line = chunk.toString().trim();
    console.log(line);

    if (line === 'stop') {
        process.exit(0);
    }
});

console.log('READING');
