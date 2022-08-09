/*
  eslint jest/expect-expect: ["error", {
    "assertFunctionNames": ["expect", "expectLinesForProcessStartAndStop", "expectLinesForTimingsTable"]
  }]
*/

import * as readline from 'readline';
import _ from 'lodash';
import * as Rx from 'rxjs';
import { buffer, map } from 'rxjs/operators';
import { spawn } from 'child_process';

const isWindows = process.platform === 'win32';
const createKillMessage = (prefix: string) =>
    new RegExp(_.escapeRegExp(prefix) + ' exited with code ' + (isWindows ? 1 : '(SIGTERM|143)'));

/**
 * Creates a child process running concurrently with the given args.
 * Returns observables for its combined stdout + stderr output, close events, pid, and stdin stream.
 */
const run = (args: string) => {
    // Using '--cache' means the first run is slower, but subsequent runs are then much faster.
    const child = spawn(`esr --cache ./concurrently.ts ${args}`, {
        shell: true,
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

    const close = Rx.fromEvent<[number | null, NodeJS.Signals | null]>(child, 'close');
    const log = Rx.merge(
        Rx.fromEvent<Buffer>(stdout, 'line'),
        Rx.fromEvent<Buffer>(stderr, 'line')
    ).pipe(map(data => data.toString()));

    return {
        close,
        log,
        stdin: child.stdin,
        pid: child.pid,
    };
};

it('has help command', () => {
    return new Promise<void>(done => {
        run('--help').close.subscribe(event => {
            expect(event[0]).toBe(0);
            done();
        }, done);
    });
});

it('has version command', () => {
    return new Promise<void>(done => {
        Rx.combineLatest([run('--version').close, run('-V').close, run('-v').close]).subscribe(
            events => {
                expect(events[0][0]).toBe(0);
                expect(events[1][0]).toBe(0);
                expect(events[2][0]).toBe(0);
                done();
            },
            done
        );
    });
});

describe('exiting conditions', () => {
    it('is of success by default when running successful commands', () => {
        return new Promise<void>(done => {
            run('"echo foo" "echo bar"').close.subscribe(exit => {
                expect(exit[0]).toBe(0);
                done();
            }, done);
        });
    });

    it('is of failure by default when one of the command fails', () => {
        return new Promise<void>(done => {
            run('"echo foo" "exit 1"').close.subscribe(exit => {
                expect(exit[0]).toBeGreaterThan(0);
                done();
            }, done);
        });
    });

    it('is of success when --success=first and first command to exit succeeds', () => {
        return new Promise<void>(done => {
            run('--success=first "echo foo" "sleep 0.5 && exit 1"').close.subscribe(exit => {
                expect(exit[0]).toBe(0);
                done();
            }, done);
        });
    });

    it('is of failure when --success=first and first command to exit fails', () => {
        return new Promise<void>(done => {
            run('--success=first "exit 1" "sleep 0.5 && echo foo"').close.subscribe(exit => {
                expect(exit[0]).toBeGreaterThan(0);
                done();
            }, done);
        });
    });

    it('is of success when --success=last and last command to exit succeeds', () => {
        return new Promise<void>(done => {
            run('--success=last "exit 1" "sleep 0.5 && echo foo"').close.subscribe(exit => {
                expect(exit[0]).toBe(0);
                done();
            }, done);
        });
    });

    it('is of failure when --success=last and last command to exit fails', () => {
        return new Promise<void>(done => {
            run('--success=last "echo foo" "sleep 0.5 && exit 1"').close.subscribe(exit => {
                expect(exit[0]).toBeGreaterThan(0);
                done();
            }, done);
        });
    });

    // TODO
    // - Test is currently not working on Ubuntu & Windows (reaches timeout)
    // - Additionally, it seems like exit code on Windows is not '0' which might be due to the following fact:
    //   "Windows platforms will throw an error if the pid is used to kill a process group."
    //
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('is of success when a SIGINT is sent', () => {
        return new Promise<void>(done => {
            const child = run('"node fixtures/read-echo.js"');

            child.log.subscribe(line => {
                // Wait for the command to be started before sending SIGINT
                if (/READING/.test(line)) {
                    process.kill(child.pid, 'SIGINT');
                }
            });

            child.close.subscribe(exit => {
                expect(exit[0]).toBe(isWindows ? 1 : 0);
                done();
            }, done);
        });
    });

    it('is aliased to -s', () => {
        return new Promise<void>(done => {
            run('-s last "exit 1" "sleep 0.5 && echo foo"').close.subscribe(exit => {
                expect(exit[0]).toBe(0);
                done();
            }, done);
        });
    });
});

describe('--raw', () => {
    it('is aliased to -r', () => {
        return new Promise<void>(done => {
            const child = run('-r "echo foo" "echo bar"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toHaveLength(2);
                expect(lines).toContainEqual(expect.stringContaining('foo'));
                expect(lines).toContainEqual(expect.stringContaining('bar'));
                done();
            }, done);
        });
    });

    it('does not log any extra output', () => {
        return new Promise<void>(done => {
            const child = run('--raw "echo foo" "echo bar"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toHaveLength(2);
                expect(lines).toContainEqual(expect.stringContaining('foo'));
                expect(lines).toContainEqual(expect.stringContaining('bar'));
                done();
            }, done);
        });
    });
});

describe('--hide', () => {
    it('hides the output of a process by its index', () => {
        return new Promise<void>(done => {
            const child = run('--hide 1 "echo foo" "echo bar"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toContainEqual(expect.stringContaining('foo'));
                expect(lines).not.toContainEqual(expect.stringContaining('bar'));
                done();
            }, done);
        });
    });

    it('hides the output of a process by its name', () => {
        return new Promise<void>(done => {
            const child = run('-n foo,bar --hide bar "echo foo" "echo bar"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toContainEqual(expect.stringContaining('foo'));
                expect(lines).not.toContainEqual(expect.stringContaining('bar'));
                done();
            }, done);
        });
    });
});

describe('--group', () => {
    it('groups output per process', () => {
        return new Promise<void>(done => {
            const child = run('--group "echo foo && sleep 1 && echo bar" "echo baz"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines.slice(0, 4)).toEqual([
                    expect.stringContaining('foo'),
                    expect.stringContaining('bar'),
                    expect.any(String),
                    expect.stringContaining('baz'),
                ]);
                done();
            }, done);
        });
    });
});

describe('--names', () => {
    it('is aliased to -n', () => {
        return new Promise<void>(done => {
            const child = run('-n foo,bar "echo foo" "echo bar"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toContainEqual(expect.stringContaining('[foo] foo'));
                expect(lines).toContainEqual(expect.stringContaining('[bar] bar'));
                done();
            }, done);
        });
    });

    it('prefixes with names', () => {
        return new Promise<void>(done => {
            const child = run('--names foo,bar "echo foo" "echo bar"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toContainEqual(expect.stringContaining('[foo] foo'));
                expect(lines).toContainEqual(expect.stringContaining('[bar] bar'));
                done();
            }, done);
        });
    });

    it('is split using --name-separator arg', () => {
        return new Promise<void>(done => {
            const child = run('--names "foo|bar" --name-separator "|" "echo foo" "echo bar"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toContainEqual(expect.stringContaining('[foo] foo'));
                expect(lines).toContainEqual(expect.stringContaining('[bar] bar'));
                done();
            }, done);
        });
    });
});

describe('--prefix', () => {
    it('is aliased to -p', () => {
        return new Promise<void>(done => {
            const child = run('-p command "echo foo" "echo bar"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toContainEqual(expect.stringContaining('[echo foo] foo'));
                expect(lines).toContainEqual(expect.stringContaining('[echo bar] bar'));
                done();
            }, done);
        });
    });

    it('specifies custom prefix', () => {
        return new Promise<void>(done => {
            const child = run('--prefix command "echo foo" "echo bar"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toContainEqual(expect.stringContaining('[echo foo] foo'));
                expect(lines).toContainEqual(expect.stringContaining('[echo bar] bar'));
                done();
            }, done);
        });
    });
});

describe('--prefix-length', () => {
    it('is aliased to -l', () => {
        return new Promise<void>(done => {
            const child = run('-p command -l 5 "echo foo" "echo bar"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toContainEqual(expect.stringContaining('[ec..o] foo'));
                expect(lines).toContainEqual(expect.stringContaining('[ec..r] bar'));
                done();
            }, done);
        });
    });

    it('specifies custom prefix length', () => {
        return new Promise<void>(done => {
            const child = run('--prefix command --prefix-length 5 "echo foo" "echo bar"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toContainEqual(expect.stringContaining('[ec..o] foo'));
                expect(lines).toContainEqual(expect.stringContaining('[ec..r] bar'));
                done();
            }, done);
        });
    });
});

describe('--restart-tries', () => {
    it('changes how many times a command will restart', () => {
        return new Promise<void>(done => {
            const child = run('--restart-tries 1 "exit 1"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toEqual([
                    expect.stringContaining('[0] exit 1 exited with code 1'),
                    expect.stringContaining('[0] exit 1 restarted'),
                    expect.stringContaining('[0] exit 1 exited with code 1'),
                ]);
                done();
            }, done);
        });
    });
});

describe('--kill-others', () => {
    it('is aliased to -k', () => {
        return new Promise<void>(done => {
            const child = run('-k "sleep 10" "exit 0"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toContainEqual(
                    expect.stringContaining('[1] exit 0 exited with code 0')
                );
                expect(lines).toContainEqual(
                    expect.stringContaining('Sending SIGTERM to other processes')
                );
                expect(lines).toContainEqual(
                    expect.stringMatching(createKillMessage('[0] sleep 10'))
                );
                done();
            }, done);
        });
    });

    it('kills on success', () => {
        return new Promise<void>(done => {
            const child = run('--kill-others "sleep 10" "exit 0"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toContainEqual(
                    expect.stringContaining('[1] exit 0 exited with code 0')
                );
                expect(lines).toContainEqual(
                    expect.stringContaining('Sending SIGTERM to other processes')
                );
                expect(lines).toContainEqual(
                    expect.stringMatching(createKillMessage('[0] sleep 10'))
                );
                done();
            }, done);
        });
    });

    it('kills on failure', () => {
        return new Promise<void>(done => {
            const child = run('--kill-others "sleep 10" "exit 1"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toContainEqual(
                    expect.stringContaining('[1] exit 1 exited with code 1')
                );
                expect(lines).toContainEqual(
                    expect.stringContaining('Sending SIGTERM to other processes')
                );
                expect(lines).toContainEqual(
                    expect.stringMatching(createKillMessage('[0] sleep 10'))
                );
                done();
            }, done);
        });
    });
});

describe('--kill-others-on-fail', () => {
    it('does not kill on success', () => {
        return new Promise<void>(done => {
            const child = run('--kill-others-on-fail "sleep 0.5" "exit 0"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toContainEqual(
                    expect.stringContaining('[1] exit 0 exited with code 0')
                );
                expect(lines).toContainEqual(
                    expect.stringContaining('[0] sleep 0.5 exited with code 0')
                );
                done();
            }, done);
        });
    });

    it('kills on failure', () => {
        return new Promise<void>(done => {
            const child = run('--kill-others-on-fail "sleep 10" "exit 1"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toContainEqual(
                    expect.stringContaining('[1] exit 1 exited with code 1')
                );
                expect(lines).toContainEqual(
                    expect.stringContaining('Sending SIGTERM to other processes')
                );
                expect(lines).toContainEqual(
                    expect.stringMatching(createKillMessage('[0] sleep 10'))
                );
                done();
            }, done);
        });
    });
});

describe('--handle-input', () => {
    it('is aliased to -i', () => {
        return new Promise<void>(done => {
            const lines: string[] = [];
            const child = run('-i "node fixtures/read-echo.js"');
            child.log.subscribe(line => {
                lines.push(line);
                if (/READING/.test(line)) {
                    child.stdin.write('stop\n');
                }
            });

            child.close.subscribe(exit => {
                expect(exit[0]).toBe(0);
                expect(lines).toContainEqual(expect.stringContaining('[0] stop'));
                expect(lines).toContainEqual(
                    expect.stringContaining('[0] node fixtures/read-echo.js exited with code 0')
                );
                done();
            }, done);
        });
    });

    it('forwards input to first process by default', () => {
        return new Promise<void>(done => {
            const lines: string[] = [];
            const child = run('-i "node fixtures/read-echo.js"');
            child.log.subscribe(line => {
                lines.push(line);
                if (/READING/.test(line)) {
                    child.stdin.write('stop\n');
                }
            });

            child.close.subscribe(exit => {
                expect(exit[0]).toBe(0);
                expect(lines).toContainEqual(expect.stringContaining('[0] stop'));
                expect(lines).toContainEqual(
                    expect.stringContaining('[0] node fixtures/read-echo.js exited with code 0')
                );
                done();
            }, done);
        });
    });

    it('forwards input to process --default-input-target', () => {
        return new Promise<void>(done => {
            const lines: string[] = [];
            const child = run(
                '-ki --default-input-target 1 "node fixtures/read-echo.js" "node fixtures/read-echo.js"'
            );
            child.log.subscribe(line => {
                lines.push(line);
                if (/\[1\] READING/.test(line)) {
                    child.stdin.write('stop\n');
                }
            }, done);

            child.close.subscribe(exit => {
                expect(exit[0]).toBeGreaterThan(0);
                expect(lines).toContainEqual(expect.stringContaining('[1] stop'));
                expect(lines).toContainEqual(
                    expect.stringMatching(createKillMessage('[0] node fixtures/read-echo.js'))
                );
                done();
            }, done);
        });
    });

    it('forwards input to specified process', () => {
        return new Promise<void>(done => {
            const lines: string[] = [];
            const child = run('-ki "node fixtures/read-echo.js" "node fixtures/read-echo.js"');
            child.log.subscribe(line => {
                lines.push(line);
                if (/\[1\] READING/.test(line)) {
                    child.stdin.write('1:stop\n');
                }
            }, done);

            child.close.subscribe(exit => {
                expect(exit[0]).toBeGreaterThan(0);
                expect(lines).toContainEqual(expect.stringContaining('[1] stop'));
                expect(lines).toContainEqual(
                    expect.stringMatching(createKillMessage('[0] node fixtures/read-echo.js'))
                );
                done();
            }, done);
        });
    });
});

expect.extend({
    toBeWithinRange(received, floor, ceiling) {
        const pass = received >= floor && received <= ceiling;
        if (pass) {
            return {
                message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
                pass: false,
            };
        }
    },
});

describe('--timings', () => {
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
    const expectLinesForProcessStartAndStop = (lines: string[], index: number, command: string) => {
        const escapedCommand = _.escapeRegExp(command);
        expect(lines).toContainEqual(
            expect.stringMatching(processStartedMessageRegex(index, escapedCommand))
        );
        expect(lines).toContainEqual(
            expect.stringMatching(processStoppedMessageRegex(index, escapedCommand))
        );
    };

    const expectLinesForTimingsTable = (lines: string[]) => {
        const tableTopBorderRegex = /┌[─┬]+┐/g;
        expect(lines).toContainEqual(expect.stringMatching(tableTopBorderRegex));
        const tableHeaderRowRegex = /(\W+(name|duration|exit code|killed|command)\W+){5}/g;
        expect(lines).toContainEqual(expect.stringMatching(tableHeaderRowRegex));
        const tableBottomBorderRegex = /└[─┴]+┘/g;
        expect(lines).toContainEqual(expect.stringMatching(tableBottomBorderRegex));
    };

    it('shows timings on success', () => {
        return new Promise<void>(done => {
            const child = run('--timings "sleep 0.5" "exit 0"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expectLinesForProcessStartAndStop(lines, 0, 'sleep 0.5');
                expectLinesForProcessStartAndStop(lines, 1, 'exit 0');
                expectLinesForTimingsTable(lines);
                done();
            }, done);
        });
    });

    it('shows timings on failure', () => {
        return new Promise<void>(done => {
            const child = run('--timings "sleep 0.75" "exit 1"');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expectLinesForProcessStartAndStop(lines, 0, 'sleep 0.75');
                expectLinesForProcessStartAndStop(lines, 1, 'exit 1');
                expectLinesForTimingsTable(lines);
                done();
            }, done);
        });
    });
});

describe('--passthrough-arguments', () => {
    it('argument placeholders are properly replaced when passthrough-arguments is enabled', () => {
        return new Promise<void>(done => {
            const child = run('--passthrough-arguments "echo {1}" -- echo');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toContainEqual(
                    expect.stringContaining('[0] echo echo exited with code 0')
                );
                done();
            }, done);
        });
    });

    it('argument placeholders are not replaced when passthrough-arguments is disabled', () => {
        return new Promise<void>(done => {
            const child = run('"echo {1}" -- echo');
            child.log.pipe(buffer(child.close)).subscribe(lines => {
                expect(lines).toContainEqual(
                    expect.stringContaining('[0] echo {1} exited with code 0')
                );
                expect(lines).toContainEqual(
                    expect.stringContaining('[1] echo exited with code 0')
                );
                done();
            }, done);
        });
    });
});
