/*
 * Prints a line, clears the screen the way create-react-app and `tsc --watch` do,
 * then prints another line, used to test preventing the terminal from being cleared
 */
import process from 'node:process';

process.stdout.write('foo\n');
process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
process.stdout.write('\x1Bc');
process.stdout.write('bar\n');
