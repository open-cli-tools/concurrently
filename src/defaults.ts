// This file is meant to be a shared place for default configs.
// It's read by the flow controllers, the executable, etc.
// Refer to tests for the meaning of the different possible values.

import { SuccessCondition } from './completion-listener';

export const defaultInputTarget = 0;

/**
 * Whether process.stdin should be forwarded to child processes.
 */
export const handleInput = false;

/**
 * How many processes to run at once.
 */
export const maxProcesses = 0;

/**
 * Indices and names of commands whose output are not to be logged.
 */
export const hide = '';

/**
 * The character to split <names> on.
 */
export const nameSeparator = ',';

/**
 * Which prefix style to use when logging processes output.
 */
export const prefix = '';

/**
 * Default prefix color.
 * @see https://www.npmjs.com/package/chalk
 */
export const prefixColors = 'reset';

/**
 * How many bytes we'll show on the command prefix.
 */
export const prefixLength = 10;

export const raw = false;

/**
 * Number of attempts of restarting a process, if it exits with non-0 code.
 */
export const restartTries = 0;

/**
 * How many milliseconds concurrently should wait before restarting a process.
 */
export const restartDelay = 0;

/**
 * Condition of success for concurrently itself.
 */
export const success = 'all' as SuccessCondition;

/**
 * Date format used when logging date/time.
 * @see https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
 */
export const timestampFormat = 'yyyy-MM-dd HH:mm:ss.SSS';

/**
 * Current working dir passed as option to spawn command.
 * Defaults to process.cwd()
 */
export const cwd: string | undefined = undefined;

/**
 * Whether to show timing information for processes in console output.
 */
export const timings = false;

/**
 * Passthrough additional arguments to commands (accessible via placeholders) instead of treating them as commands.
 */
export const passthroughArguments = false;

/**
 * Signal to send to other processes if one exits or dies.
 *
 * Defaults to OS specific signal. (SIGTERM on Linux/MacOS)
 */
export const killSignal: string | undefined = undefined;
