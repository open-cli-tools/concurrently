import { subscribeSpyTo } from '@hirez_io/observer-spy';
import { spawn } from 'child_process';
import { build } from 'esbuild';
import fs from 'fs';
import { escapeRegExp } from 'lodash';
import os from 'os';
import path from 'path';
import * as readline from 'readline';
import * as Rx from 'rxjs';
import { map } from 'rxjs/operators';
import stringArgv from 'string-argv';

const isWindows = process.platform === 'win32';
const createKillMessage = (prefix: string) =>
    new RegExp(escapeRegExp(prefix) + ' exited with code ' + (isWindows ? 1 : '(SIGTERM|143)'));

let tmpDir: string;

beforeAll(async () => {
    // Build 'concurrently' and store it in a temporary directory
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'concurrently-'));
    await build({
        entryPoints: [path.join(__dirname, 'concurrently.ts')],
        platform: 'node',
        bundle: true,
        outfile: path.join(tmpDir, 'concurrently.js'),
    });
});

afterAll(() => {
    // Remove the temporary directory
    if (tmpDir) {
        fs.rmdirSync(tmpDir, { recursive: true });
    }
});

/**
 * Creates a child process running 'concurrently' with the given args.
 * Returns observables for its combined stdout + stderr output, close events, pid, and stdin stream.
 */
const run = (args: string) => {
    const child = spawn('node', [path.join(tmpDir, 'concurrently.js'), ...stringArgv(args)], {
        cwd: __dirname,
        env: {
            ...process.env,
            // When upgrading from jest 23 -> 24, colors started printing in the test output.
            // They are forcibly disabled here.
            FORCE_COLOR: '0',
        },
    });

    const stdout = readline.createInterface({
        input: child.stdout,
        output: null,
    });

    const stderr = readline.createInterface({
        input: child.stderr,
        output: null,
    });

    const log = new Rx.Observable<string>((observer) => {
        stdout.on('line', (line) => {
            observer.next(line);
        });

        stderr.on('line', (line) => {
            observer.next(line);
        });

        child.on('close', () => {
            observer.complete();
        });
    });

    const exit = Rx.firstValueFrom(
        Rx.fromEvent(child, 'exit').pipe(
            map((exit: [number | null, NodeJS.Signals | null]) => {
                return {
                    /** The exit code if the child exited on its own. */
                    code: exit[0],
                    /** The signal by which the child process was terminated. */
                    signal: exit[1],
                };
            })
        )
    );

    const getLogLines = async (): Promise<string[]> => {
        const observerSpy = subscribeSpyTo(log);
        await observerSpy.onComplete();
        observerSpy.unsubscribe();
        return observerSpy.getValues();
    };

    return {
        stdin: child.stdin,
        pid: child.pid,
        log,
        getLogLines,
        exit,
    };
};

it('has help command', async () => {
    const exit = await run('--help').exit;

    expect(exit.code).toBe(0);
});

describe('has version command', () => {
    it.each(['--version', '-V', '-v'])('%s', async (arg) => {
        const exit = await run(arg).exit;

        expect(exit.code).toBe(0);
    });
});

describe('exiting conditions', () => {
    it('is of success by default when running successful commands', async () => {
        const exit = await run('"echo foo" "echo bar"').exit;

        expect(exit.code).toBe(0);
    });

    it('is of failure by default when one of the command fails', async () => {
        const exit = await run('"echo foo" "exit 1"').exit;

        expect(exit.code).toBeGreaterThan(0);
    });

    it('is of success when --success=first and first command to exit succeeds', async () => {
        const exit = await run('--success=first "echo foo" "node fixtures/sleep.mjs 0.5 && exit 1"')
            .exit;

        expect(exit.code).toBe(0);
    });

    it('is of failure when --success=first and first command to exit fails', async () => {
        const exit = await run('--success=first "exit 1" "node fixtures/sleep.mjs 0.5 && echo foo"')
            .exit;

        expect(exit.code).toBeGreaterThan(0);
    });

    describe('is of success when --success=last and last command to exit succeeds', () => {
        it.each(['--success=last', '-s last'])('%s', async (arg) => {
            const exit = await run(`${arg} "exit 1" "node fixtures/sleep.mjs 0.5 && echo foo"`)
                .exit;

            expect(exit.code).toBe(0);
        });
    });

    it('is of failure when --success=last and last command to exit fails', async () => {
        const exit = await run('--success=last "echo foo" "node fixtures/sleep.mjs 0.5 && exit 1"')
            .exit;

        expect(exit.code).toBeGreaterThan(0);
    });

    it('is of success when a SIGINT is sent', async () => {
        const child = run('"node fixtures/read-echo.js"');
        // Wait for command to have started before sending SIGINT
        child.log.subscribe((line) => {
            if (/READING/.test(line)) {
                process.kill(child.pid, 'SIGINT');
            }
        });
        const exit = await child.exit;

        // TODO
        // Exit code on Windows is not '0' which might be due to the following fact:
        // "Windows platforms will throw an error if the pid is used to kill a process group."
        expect(exit.code).toBe(isWindows ? 1 : 0);
    });
});

describe('does not log any extra output', () => {
    it.each(['--raw', '-r'])('%s', async (arg) => {
        const lines = await run(`${arg} "echo foo" "echo bar"`).getLogLines();

        expect(lines).toHaveLength(2);
        expect(lines).toContainEqual(expect.stringContaining('foo'));
        expect(lines).toContainEqual(expect.stringContaining('bar'));
    });
});

describe('--hide', () => {
    it('hides the output of a process by its index', async () => {
        const lines = await run('--hide 1 "echo foo" "echo bar"').getLogLines();

        expect(lines).toContainEqual(expect.stringContaining('foo'));
        expect(lines).not.toContainEqual(expect.stringContaining('bar'));
    });

    it('hides the output of a process by its name', async () => {
        const lines = await run('-n foo,bar --hide bar "echo foo" "echo bar"').getLogLines();

        expect(lines).toContainEqual(expect.stringContaining('foo'));
        expect(lines).not.toContainEqual(expect.stringContaining('bar'));
    });
});

describe('--group', () => {
    it('groups output per process', async () => {
        const lines = await run(
            '--group "echo foo && node fixtures/sleep.mjs 1 && echo bar" "echo baz"'
        ).getLogLines();

        expect(lines.slice(0, 4)).toEqual([
            expect.stringContaining('foo'),
            expect.stringContaining('bar'),
            expect.any(String),
            expect.stringContaining('baz'),
        ]);
    });
});

describe('--names', () => {
    describe('prefixes with names', () => {
        it.each(['--names', '-n'])('%s', async (arg) => {
            const lines = await run(`${arg} foo,bar "echo foo" "echo bar"`).getLogLines();

            expect(lines).toContainEqual(expect.stringContaining('[foo] foo'));
            expect(lines).toContainEqual(expect.stringContaining('[bar] bar'));
        });
    });

    it('is split using --name-separator arg', async () => {
        const lines = await run(
            '--names "foo|bar" --name-separator "|" "echo foo" "echo bar"'
        ).getLogLines();

        expect(lines).toContainEqual(expect.stringContaining('[foo] foo'));
        expect(lines).toContainEqual(expect.stringContaining('[bar] bar'));
    });
});

describe('specifies custom prefix', () => {
    it.each(['--prefix', '-p'])('%s', async (arg) => {
        const lines = await run(`${arg} command "echo foo" "echo bar"`).getLogLines();

        expect(lines).toContainEqual(expect.stringContaining('[echo foo] foo'));
        expect(lines).toContainEqual(expect.stringContaining('[echo bar] bar'));
    });
});

describe('specifies custom prefix length', () => {
    it.each(['--prefix command --prefix-length 5', '-p command -l 5'])('%s', async (arg) => {
        const lines = await run(`${arg} "echo foo" "echo bar"`).getLogLines();

        expect(lines).toContainEqual(expect.stringContaining('[ec..o] foo'));
        expect(lines).toContainEqual(expect.stringContaining('[ec..r] bar'));
    });
});

describe('--restart-tries', () => {
    it('changes how many times a command will restart', async () => {
        const lines = await run('--restart-tries 1 "exit 1"').getLogLines();

        expect(lines).toEqual([
            expect.stringContaining('[0] exit 1 exited with code 1'),
            expect.stringContaining('[0] exit 1 restarted'),
            expect.stringContaining('[0] exit 1 exited with code 1'),
        ]);
    });
});

describe('--kill-others', () => {
    describe('kills on success', () => {
        it.each(['--kill-others', '-k'])('%s', async (arg) => {
            const lines = await run(`${arg} "node fixtures/sleep.mjs 10" "exit 0"`).getLogLines();

            expect(lines).toContainEqual(expect.stringContaining('[1] exit 0 exited with code 0'));
            expect(lines).toContainEqual(
                expect.stringContaining('Sending SIGTERM to other processes')
            );
            expect(lines).toContainEqual(
                expect.stringMatching(createKillMessage('[0] node fixtures/sleep.mjs 10'))
            );
        });
    });

    it('kills on failure', async () => {
        const lines = await run(
            '--kill-others "node fixtures/sleep.mjs 10" "exit 1"'
        ).getLogLines();

        expect(lines).toContainEqual(expect.stringContaining('[1] exit 1 exited with code 1'));
        expect(lines).toContainEqual(expect.stringContaining('Sending SIGTERM to other processes'));
        expect(lines).toContainEqual(
            expect.stringMatching(createKillMessage('[0] node fixtures/sleep.mjs 10'))
        );
    });
});

describe('--kill-others-on-fail', () => {
    it('does not kill on success', async () => {
        const lines = await run(
            '--kill-others-on-fail "node fixtures/sleep.mjs 0.5" "exit 0"'
        ).getLogLines();

        expect(lines).toContainEqual(expect.stringContaining('[1] exit 0 exited with code 0'));
        expect(lines).toContainEqual(
            expect.stringContaining('[0] node fixtures/sleep.mjs 0.5 exited with code 0')
        );
    });

    it('kills on failure', async () => {
        const lines = await run(
            '--kill-others-on-fail "node fixtures/sleep.mjs 10" "exit 1"'
        ).getLogLines();

        expect(lines).toContainEqual(expect.stringContaining('[1] exit 1 exited with code 1'));
        expect(lines).toContainEqual(expect.stringContaining('Sending SIGTERM to other processes'));
        expect(lines).toContainEqual(
            expect.stringMatching(createKillMessage('[0] node fixtures/sleep.mjs 10'))
        );
    });
});

describe('--handle-input', () => {
    describe('forwards input to first process by default', () => {
        it.each(['--handle-input', '-i'])('%s', async (arg) => {
            const child = run(`${arg} "node fixtures/read-echo.js"`);
            child.log.subscribe((line) => {
                if (/READING/.test(line)) {
                    child.stdin.write('stop\n');
                }
            });
            const lines = await child.getLogLines();
            const exit = await child.exit;

            expect(exit.code).toBe(0);
            expect(lines).toContainEqual(expect.stringContaining('[0] stop'));
            expect(lines).toContainEqual(
                expect.stringContaining('[0] node fixtures/read-echo.js exited with code 0')
            );
        });
    });

    it('forwards input to process --default-input-target', async () => {
        const child = run(
            '-ki --default-input-target 1 "node fixtures/read-echo.js" "node fixtures/read-echo.js"'
        );
        child.log.subscribe((line) => {
            if (/\[1\] READING/.test(line)) {
                child.stdin.write('stop\n');
            }
        });
        const lines = await child.getLogLines();
        const exit = await child.exit;

        expect(exit.code).toBeGreaterThan(0);
        expect(lines).toContainEqual(expect.stringContaining('[1] stop'));
        expect(lines).toContainEqual(
            expect.stringMatching(createKillMessage('[0] node fixtures/read-echo.js'))
        );
    });

    it('forwards input to specified process', async () => {
        const child = run('-ki "node fixtures/read-echo.js" "node fixtures/read-echo.js"');
        child.log.subscribe((line) => {
            if (/\[1\] READING/.test(line)) {
                child.stdin.write('1:stop\n');
            }
        });
        const lines = await child.getLogLines();
        const exit = await child.exit;

        expect(exit.code).toBeGreaterThan(0);
        expect(lines).toContainEqual(expect.stringContaining('[1] stop'));
        expect(lines).toContainEqual(
            expect.stringMatching(createKillMessage('[0] node fixtures/read-echo.js'))
        );
    });
});

interface CustomMatchers<R = unknown> {
    toHaveProcessStartAndStop(index: number, command: string): R;
    toHaveTimingsTable(): R;
}
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        // eslint-disable-next-line @typescript-eslint/no-empty-interface
        interface Expect extends CustomMatchers {}
        // eslint-disable-next-line @typescript-eslint/no-empty-interface
        interface Matchers<R> extends CustomMatchers<R> {}
        // eslint-disable-next-line @typescript-eslint/no-empty-interface
        interface InverseAsymmetricMatchers extends CustomMatchers {}
    }
}

expect.extend({
    toHaveProcessStartAndStop(lines: string[], index: number, command: string) {
        const defaultTimestampFormatRegex = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.\d{3}/;
        const processStartedMessageRegex = (index: number, command: string) => {
            return new RegExp(
                `^\\[${index}] ${command} started at ${defaultTimestampFormatRegex.source}$`
            );
        };
        const processStoppedMessageRegex = (index: number, command: string) => {
            return new RegExp(
                `^\\[${index}] ${command} stopped at ${defaultTimestampFormatRegex.source} after (\\d|,)+ms$`
            );
        };
        const escapedCommand = escapeRegExp(command);

        if (
            !lines.some((line) => line.match(processStartedMessageRegex(index, escapedCommand))) ||
            !lines.some((line) => line.match(processStoppedMessageRegex(index, escapedCommand)))
        ) {
            return {
                message: () => 'Expected lines to have process start and stop messages',
                pass: false,
            };
        }

        return {
            message: () => 'Expected lines to not have process start and stop messages',
            pass: true,
        };
    },

    toHaveTimingsTable(lines: string[]) {
        const tableTopBorderRegex = /┌[─┬]+┐/g;
        const tableHeaderRowRegex = /(\W+(name|duration|exit code|killed|command)\W+){5}/g;
        const tableBottomBorderRegex = /└[─┴]+┘/g;

        if (
            !lines.some((line) => line.match(tableTopBorderRegex)) ||
            !lines.some((line) => line.match(tableHeaderRowRegex)) ||
            !lines.some((line) => line.match(tableBottomBorderRegex))
        ) {
            return {
                message: () => 'Expected lines to have timings table',
                pass: false,
            };
        }

        return {
            message: () => 'Expected lines to not have timings table',
            pass: true,
        };
    },
});

describe('--timings', () => {
    it('shows timings on success', async () => {
        const lines = await run('--timings "node fixtures/sleep.mjs 0.5" "exit 0"').getLogLines();

        expect(lines).toHaveProcessStartAndStop(0, 'node fixtures/sleep.mjs 0.5');
        expect(lines).toHaveProcessStartAndStop(1, 'exit 0');
        expect(lines).toHaveTimingsTable();
    });

    it('shows timings on failure', async () => {
        const lines = await run('--timings "node fixtures/sleep.mjs 0.75" "exit 1"').getLogLines();

        expect(lines).toHaveProcessStartAndStop(0, 'node fixtures/sleep.mjs 0.75');
        expect(lines).toHaveProcessStartAndStop(1, 'exit 1');
        expect(lines).toHaveTimingsTable();
    });
});

describe('--passthrough-arguments', () => {
    it('argument placeholders are properly replaced when passthrough-arguments is enabled', async () => {
        const lines = await run('--passthrough-arguments "echo {1}" -- echo').getLogLines();

        expect(lines).toContainEqual(expect.stringContaining('[0] echo echo exited with code 0'));
    });

    it('argument placeholders are not replaced when passthrough-arguments is disabled', async () => {
        const lines = await run('"echo {1}" -- echo').getLogLines();

        expect(lines).toContainEqual(expect.stringContaining('[0] echo {1} exited with code 0'));
        expect(lines).toContainEqual(expect.stringContaining('[1] echo exited with code 0'));
    });
});
