import { subscribeSpyTo } from '@hirez_io/observer-spy';
import { spawn } from 'child_process';
import { sendCtrlC, spawnWithWrapper } from 'ctrlc-wrapper';
import { build } from 'esbuild';
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as readline from 'readline';
import * as Rx from 'rxjs';
import { map } from 'rxjs/operators';
import stringArgv from 'string-argv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { escapeRegExp } from '../src/utils';

const isWindows = process.platform === 'win32';
const createKillMessage = (prefix: string, signal: 'SIGTERM' | 'SIGINT' | string) => {
    const map: Record<string, string | number> = {
        SIGTERM: isWindows ? 1 : '(SIGTERM|143)',
        // Could theoretically be anything (e.g. 0) if process has SIGINT handler
        SIGINT: isWindows ? '(3221225786|0)' : '(SIGINT|130|0)',
    };
    return new RegExp(escapeRegExp(prefix) + ' exited with code ' + (map[signal] ?? signal));
};

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
    fs.copyFileSync(path.join(__dirname, '..', 'package.json'), path.join(tmpDir, 'package.json'));
}, 8000);

afterAll(() => {
    // Remove the temporary directory where 'concurrently' was stored
    if (tmpDir) {
        fs.rmSync(tmpDir, { recursive: true });
    }
});

/**
 * Creates a child process running 'concurrently' with the given args.
 * Returns observables for its combined stdout + stderr output, close events, pid, and stdin stream.
 */
const run = (args: string, ctrlcWrapper?: boolean) => {
    const spawnFn = ctrlcWrapper ? spawnWithWrapper : spawn;
    const child = spawnFn('node', [path.join(tmpDir, 'concurrently.js'), ...stringArgv(args)], {
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
    });

    const stderr = readline.createInterface({
        input: child.stderr,
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
            map((event) => {
                const exit = event as [number | null, NodeJS.Signals | null];
                return {
                    /** The exit code if the child exited on its own. */
                    code: exit[0],
                    /** The signal by which the child process was terminated. */
                    signal: exit[1],
                };
            }),
        ),
    );

    const getLogLines = async (): Promise<string[]> => {
        const observerSpy = subscribeSpyTo(log);
        await observerSpy.onComplete();
        observerSpy.unsubscribe();
        return observerSpy.getValues();
    };

    return {
        process: child,
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

it('prints help when no arguments are passed', async () => {
    const exit = await run('').exit;
    expect(exit.code).toBe(0);
});

describe('has version command', () => {
    const pkg = fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8');
    const { version } = JSON.parse(pkg);

    it.each(['--version', '-V', '-v'])('%s', async (arg) => {
        const child = run(arg);
        const log = await child.getLogLines();
        expect(log).toContain(version);

        const { code } = await child.exit;
        expect(code).toBe(0);
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
        // Windows doesn't support sending signals like on POSIX platforms.
        // However, in a console, processes can be interrupted with CTRL+C (like a SIGINT).
        // This is what we simulate here with the help of a wrapper application.
        const child = run('"node fixtures/read-echo.js"', isWindows);
        // Wait for command to have started before sending SIGINT
        child.log.subscribe((line) => {
            if (/READING/.test(line)) {
                if (isWindows) {
                    // Instruct the wrapper to send CTRL+C to its child
                    sendCtrlC(child.process);
                } else {
                    process.kill(Number(child.pid), 'SIGINT');
                }
            }
        });
        const lines = await child.getLogLines();
        const exit = await child.exit;

        expect(exit.code).toBe(0);
        expect(lines).toContainEqual(
            expect.stringMatching(
                createKillMessage(
                    '[0] node fixtures/read-echo.js',
                    // TODO: Flappy value due to race condition, sometimes killed by concurrently (exit code 1),
                    //       sometimes terminated on its own (exit code 0).
                    //       Related issue: https://github.com/open-cli-tools/concurrently/issues/283
                    isWindows ? '(3221225786|0|1)' : 'SIGINT',
                ),
            ),
        );
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

    it('hides the output of a process by its index in raw mode', async () => {
        const lines = await run('--hide 1 --raw "echo foo" "echo bar"').getLogLines();

        expect(lines).toHaveLength(1);
        expect(lines).toContainEqual(expect.stringContaining('foo'));
        expect(lines).not.toContainEqual(expect.stringContaining('bar'));
    });

    it('hides the output of a process by its name in raw mode', async () => {
        const lines = await run('-n foo,bar --hide bar --raw "echo foo" "echo bar"').getLogLines();

        expect(lines).toHaveLength(1);
        expect(lines).toContainEqual(expect.stringContaining('foo'));
        expect(lines).not.toContainEqual(expect.stringContaining('bar'));
    });
});

describe('--group', () => {
    it('groups output per process', async () => {
        const lines = await run(
            '--group "echo foo && node fixtures/sleep.mjs 1 && echo bar" "echo baz"',
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
            '--names "foo|bar" --name-separator "|" "echo foo" "echo bar"',
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

describe('--pad-prefix', () => {
    it('pads prefixes with spaces', async () => {
        const lines = await run('--pad-prefix -n foo,barbaz "echo foo" "echo bar"').getLogLines();

        expect(lines).toContainEqual(expect.stringContaining('[foo   ]'));
        expect(lines).toContainEqual(expect.stringContaining('[barbaz]'));
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
                expect.stringContaining('Sending SIGTERM to other processes'),
            );
            expect(lines).toContainEqual(
                expect.stringMatching(
                    createKillMessage('[0] node fixtures/sleep.mjs 10', 'SIGTERM'),
                ),
            );
        });
    });

    it('kills on failure', async () => {
        const lines = await run(
            '--kill-others "node fixtures/sleep.mjs 10" "exit 1"',
        ).getLogLines();

        expect(lines).toContainEqual(expect.stringContaining('[1] exit 1 exited with code 1'));
        expect(lines).toContainEqual(expect.stringContaining('Sending SIGTERM to other processes'));
        expect(lines).toContainEqual(
            expect.stringMatching(createKillMessage('[0] node fixtures/sleep.mjs 10', 'SIGTERM')),
        );
    });
});

describe('--kill-others-on-fail', () => {
    it('does not kill on success', async () => {
        const lines = await run(
            '--kill-others-on-fail "node fixtures/sleep.mjs 0.5" "exit 0"',
        ).getLogLines();

        expect(lines).toContainEqual(expect.stringContaining('[1] exit 0 exited with code 0'));
        expect(lines).toContainEqual(
            expect.stringContaining('[0] node fixtures/sleep.mjs 0.5 exited with code 0'),
        );
    });

    it('kills on failure', async () => {
        const lines = await run(
            '--kill-others-on-fail "node fixtures/sleep.mjs 10" "exit 1"',
        ).getLogLines();

        expect(lines).toContainEqual(expect.stringContaining('[1] exit 1 exited with code 1'));
        expect(lines).toContainEqual(expect.stringContaining('Sending SIGTERM to other processes'));
        expect(lines).toContainEqual(
            expect.stringMatching(createKillMessage('[0] node fixtures/sleep.mjs 10', 'SIGTERM')),
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
                expect.stringContaining('[0] node fixtures/read-echo.js exited with code 0'),
            );
        });
    });

    it('forwards input to process --default-input-target', async () => {
        const child = run(
            '-ki --default-input-target 1 "node fixtures/read-echo.js" "node fixtures/read-echo.js"',
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
            expect.stringMatching(createKillMessage('[0] node fixtures/read-echo.js', 'SIGTERM')),
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
            expect.stringMatching(createKillMessage('[0] node fixtures/read-echo.js', 'SIGTERM')),
        );
    });
});

describe('--teardown', () => {
    it('runs teardown commands when input commands exit', async () => {
        const lines = await run('--teardown "echo bye" "echo hey"').getLogLines();
        expect(lines).toEqual([
            expect.stringContaining('[0] hey'),
            expect.stringContaining('[0] echo hey exited with code 0'),
            expect.stringContaining('--> Running teardown command "echo bye"'),
            expect.stringContaining('bye'),
            expect.stringContaining('--> Teardown command "echo bye" exited with code 0'),
        ]);
    });

    it('runs multiple teardown commands', async () => {
        const lines = await run(
            '--teardown "echo bye" --teardown "echo bye2" "echo hey"',
        ).getLogLines();
        expect(lines).toContain('bye');
        expect(lines).toContain('bye2');
    });
});

describe('--timings', () => {
    const defaultTimestampFormatRegex = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.\d{3}/;
    const processStartedMessageRegex = (index: number, command: string) => {
        return new RegExp(
            `^\\[${index}] ${command} started at ${defaultTimestampFormatRegex.source}$`,
        );
    };
    const processStoppedMessageRegex = (index: number, command: string) => {
        return new RegExp(
            `^\\[${index}] ${command} stopped at ${defaultTimestampFormatRegex.source} after (\\d|,)+ms$`,
        );
    };

    const tableTopBorderRegex = /┌[─┬]+┐/g;
    const tableHeaderRowRegex = /(\W+(name|duration|exit code|killed|command)\W+){5}/g;
    const tableBottomBorderRegex = /└[─┴]+┘/g;

    const timingsTests = {
        'shows timings on success': ['node fixtures/sleep.mjs 0.5', 'exit 0'],
        'shows timings on failure': ['node fixtures/sleep.mjs 0.75', 'exit 1'],
    };
    it.each(Object.entries(timingsTests))('%s', async (_, commands) => {
        const lines = await run(
            `--timings ${commands.map((command) => `"${command}"`).join(' ')}`,
        ).getLogLines();

        // Expect output to contain process start / stop messages for each command
        commands.forEach((command, index) => {
            const escapedCommand = escapeRegExp(command);
            expect(lines).toContainEqual(
                expect.stringMatching(processStartedMessageRegex(index, escapedCommand)),
            );
            expect(lines).toContainEqual(
                expect.stringMatching(processStoppedMessageRegex(index, escapedCommand)),
            );
        });

        // Expect output to contain timings table
        expect(lines).toContainEqual(expect.stringMatching(tableTopBorderRegex));
        expect(lines).toContainEqual(expect.stringMatching(tableHeaderRowRegex));
        expect(lines).toContainEqual(expect.stringMatching(tableBottomBorderRegex));
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
