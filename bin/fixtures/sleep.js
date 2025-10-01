/*
 * Platform independent implementation of 'sleep' used as a command in tests
 *
 * (Windows doesn't provide the 'sleep' command by default,
 * see https://github.com/open-cli-tools/concurrently/issues/277)
 */

/* eslint-disable no-console */

const seconds = process.argv[2];
if (!seconds || isNaN(seconds) || process.argv.length > 3) {
    // Mimic behavior from native 'sleep' command
    console.error('usage: sleep seconds');
    process.exit(1);
}
await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
