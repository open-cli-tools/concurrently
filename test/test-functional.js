// Test basic usage of cli

var path = require('path');
var assert = require('assert');
var run = require('./utils').run;
var IS_WINDOWS = /^win/.test(process.platform);

// Note: Set the DEBUG_TESTS environment variable to `true` to see output of test commands.

var TEST_DIR = 'dir/';

// Abs path to test directory
var testDir = path.resolve(__dirname);
process.chdir(path.join(testDir, '..'));

describe('concurrently', function() {
    this.timeout(5000);

    it('help should be successful', () => {
        return run('node ./src/main.js --help')
            .then(function(exitCode) {
                // exit code 0 means success
                assert.strictEqual(exitCode, 0);
            });
    });

    it('version should be successful', () => {
        return run('node ./src/main.js -V')
            .then(function(exitCode) {
                assert.strictEqual(exitCode, 0);
            });
    });

    it('two successful commands should exit 0', () => {
        return run('node ./src/main.js "echo test" "echo test"')
            .then(function(exitCode) {
                assert.strictEqual(exitCode, 0);
            });
    });

    it('at least one unsuccessful commands should exit non-zero', () => {
        return run('node ./src/main.js "echo test" "nosuchcmd" "echo test"')
            .then(function(exitCode) {
                assert.notStrictEqual(exitCode, 0);
            });
    });

    it('--kill-others should kill other commands if one dies', () => {
        return run('node ./src/main.js --kill-others "sleep 1" "echo test" "sleep 0.1 && nosuchcmd"')
            .then(function(exitCode) {
                assert.notStrictEqual(exitCode, 0);
            });
    });

    it('--kill-others-on-fail should kill other commands if one exits with non-zero status code', () => {
        return run('node ./src/main.js --kill-others-on-fail "sleep 1" "exit 1" "sleep 1"')
            .then(function(exitCode) {
                assert.notStrictEqual(exitCode, 0);
            });
    });

    it('--kill-others-on-fail should NOT kill other commands if none of them exits with non-zero status code', (done) => {
        var readline = require('readline');
        var exits = 0;
        var sigtermInOutput = false;

        run('node ./src/main.js --kill-others-on-fail "echo killTest1" "echo killTest2" "echo killTest3"', {
            onOutputLine: function(line) {
                if (/SIGTERM/.test(line)) {
                    sigtermInOutput = true;
                }

                // waiting for exits
                if (/killTest\d$/.test(line)) {
                    exits++;
                }
            }
        }).then(function() {
            if(sigtermInOutput) {
                done(new Error('There was a "SIGTERM" in console output'));
            } else if (exits !== 3) {
                done(new Error('There was wrong number of echoes(' + exits + ') from executed commands'));
            } else {
                done();
            }
        });
    });

    it('--success=first should return first exit code', () => {
        return run('node ./src/main.js -k --success first "echo test" "sleep 0.1 && nosuchcmd"')
            // When killed, sleep returns null exit code
            .then(function(exitCode) {
                assert.strictEqual(exitCode, 0);
            });
    });

    it('--success=last should return last exit code', () => {
        // When killed, sleep returns null exit code
        return run('node ./src/main.js -k --success last "echo test" "sleep 0.1 && nosuchcmd"')
            .then(function(exitCode) {
                assert.notStrictEqual(exitCode, 0);
            });
    });

    it('&& nosuchcmd should return non-zero exit code', () => {
        return run('node ./src/main.js "echo 1 && nosuchcmd" "echo 1 && nosuchcmd" ')
            .then(function(exitCode) {
                assert.strictEqual(exitCode, 1);
            });
    });

    it('--prefix-colors should handle non-existent colors without failing', () => {
        return run('node ./src/main.js -c "not.a.color" "echo colors"')
            .then(function(exitCode) {
                assert.strictEqual(exitCode, 0);
            });
    });

    it('--prefix should default to "index"', () => {
        var collectedLines = []

        return run('node ./src/main.js "echo one" "echo two"', {
            onOutputLine: (line) => {
                if (/(one|two)$/.exec(line)) {
                    collectedLines.push(line)
                }
            }
        })
            .then(function(exitCode) {
                assert.strictEqual(exitCode, 0);

                collectedLines.sort()
                assert.deepEqual(collectedLines, [
                    '[0] one',
                    '[1] two'
                ])
            });
    });

    it('--names should set a different default prefix', () => {
        var collectedLines = []

        return run('node ./src/main.js -n aa,bb "echo one" "echo two"', {
            onOutputLine: (line) => {
                if (/(one|two)$/.exec(line)) {
                    collectedLines.push(line)
                }
            }
        })
            .then(function(exitCode) {
                assert.strictEqual(exitCode, 0);

                collectedLines.sort()
                assert.deepEqual(collectedLines, [
                    '[aa] one',
                    '[bb] two'
                ])
            });
    });

    it('--allow-restart should restart a proccess with non-zero exit code', (done) => {
        var readline = require('readline');
        var exitedWithOne = false;
        var restarted = false;

        run('node ./src/main.js --allow-restart "sleep 0.1 && exit 1" "sleep 1"', {
            pipe: false,
            onOutputLine: (line) => {
                var re = /exited with code (.+)/.exec(line);
                if (re && re[1] === '1') {
                    exitedWithOne = true
                }

                if (/restarted/.test(line)) {
                    restarted = true;
                }
            }
        }).then(function() {
            if (exitedWithOne && restarted) {
                done();
            } else {
                done(new Error('No restarted process exited with code 1'));
            }
        });
    });

    it('--restart-after=n should restart a proccess after n miliseconds', (done) => {
        var readline = require('readline');
        var start, end;

        run('node ./src/main.js --allow-restart --restart-after 300 "exit 1" "sleep 1"', {
            pipe: false,
            onOutputLine: (line) => {
                if (!start && /exited with code (.+)/.test(line)) {
                    start = new Date().getTime();
                }

                if (!end && /restarted/.test(line)) {
                    end = new Date().getTime();
                }
            }
        }).then(function() {
            // we accept 100 miliseconds of error
            if (end - start >= 300 && end - start < 400) {
                done();
            } else {
                done(new Error('No restarted process after 300 miliseconds'));
            }
        });
    });
    it('--restart-tries=n should restart a proccess at most n times', (done) => {
        var readline = require('readline');
        var restartedTimes = 0;

        run('node ./src/main.js --allow-restart --restart-tries 2 "exit 1" "sleep 1"', {
            pipe: false,
            onOutputLine: (line) => {
                if (/restarted/.test(line)) {
                    restartedTimes++;
                }
            }
        }).then(function() {
            if (restartedTimes == 2) {
                done();
            } else {
                done(new Error('No restarted process twice'));
            }
        });
    });

    ['SIGINT', 'SIGTERM'].forEach((signal) => {
      if (IS_WINDOWS) {
          console.log('IS_WINDOWS=true');
          console.log('Skipping SIGINT/SIGTERM propagation tests ..');
          return;
      }

      it('killing it with ' + signal + ' should propagate the signal to the children', function(done) {
        var readline = require('readline');
        var waitingStart = 2;
        var waitingSignal = 2;

        function waitForSignal(cb) {
          if (waitingSignal) {
            setTimeout(waitForSignal, 100);
          } else {
            cb();
          }
        }

        run('node ./src/main.js "node ./test/support/signal.js" "node ./test/support/signal.js"', {
          onOutputLine: function(line, child) {
            // waiting for startup
            if (/STARTED/.test(line)) {
              waitingStart--;
            }
            if (!waitingStart) {
              // both processes are started
              child.kill(signal);
            }

            // waiting for signal
            if (new RegExp(signal).test(line)) {
              waitingSignal--;
            }
          }
        }).then(function() {
          waitForSignal(done);
        });
      });
    });
});

function resolve(relativePath) {
    return path.join(testDir, relativePath);
}
