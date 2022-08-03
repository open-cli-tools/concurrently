/*
 * Platform independent implementation of 'sleep' used as a command in tests
 *
 * (Windows doesn't provide the 'sleep' command by default,
 * see https://github.com/open-cli-tools/concurrently/issues/277)
 */

/* eslint-disable no-console */
async function run(s) {
    await new Promise(resolve => setTimeout(resolve, s * 1000));
}

const s = process.argv[2];
if (!s || isNaN(s) || process.argv.length > 3) {
    // Mimic behavior from native 'sleep' command
    console.error(`usage: sleep seconds`);
    process.exit(1);
}
run(s);
