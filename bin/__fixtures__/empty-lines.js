/*
 * Prints a line, an empty line, a whitespace-only line, and another line,
 * used to test hiding empty lines
 */
import process from 'node:process';

process.stdout.write('foo\n\n  \nbar\n');
