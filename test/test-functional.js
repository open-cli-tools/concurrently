// Test basic usage of cli

var path = require('path');
var assert = require('assert');
var run = require('./utils').run;
var IS_WINDOWS = /^win/.test(process.platform);

// If true, output of commands are shown
var DEBUG_TESTS = process.env.DEBUG_TESTS === 'true';
var TEST_DIR = 'dir/';

// Abs path to test directory
var testDir = path.resolve(__dirname);
process.chdir(path.join(testDir, '..'));

describe('concurrently', function() {
    this.timeout(5000);

    it('help should be successful', () => {
        return run('node ./src/main.js --help', {pipe: DEBUG_TESTS})
            .then(function(exitCode) {
                // exit code 0 means success
                assert.strictEqual(exitCode, 0);
            });
    });

    it('version should be successful', () => {
        return run('node ./src/main.js -V', {pipe: DEBUG_TESTS})
            .then(function(exitCode) {
                assert.strictEqual(exitCode, 0);
            });
    });

    it('two successful commands should exit 0', () => {
        return run('node ./src/main.js "echo test" "echo test"', {pipe: DEBUG_TESTS})
            .then(function(exitCode) {
                assert.strictEqual(exitCode, 0);
            });
    });

    it('at least one unsuccessful commands should exit non-zero', () => {
        return run('node ./src/main.js "echo test" "nosuchcmd" "echo test"', {pipe: DEBUG_TESTS})
            .then(function(exitCode) {
                assert.notStrictEqual(exitCode, 0);
            });
    });

    it('--kill-others should kill other commands if one dies', () => {
        // This test would timeout if kill others option does not work
        return run('node ./src/main.js --kill-others "sleep 1000" "echo test" "sleep 1000"', {pipe: DEBUG_TESTS})
            .then(function(exitCode) {
                assert.notStrictEqual(exitCode, 0);
            });
    });

    it('--success=first should return first exit code', () => {
        return run('node ./src/main.js -k --success first "echo test" "sleep 1000" ', {pipe: DEBUG_TESTS})
            // When killed, sleep returns null exit code
            .then(function(exitCode) {
                assert.strictEqual(exitCode, 0);
            });
    });

    it('--success=last should return last exit code', () => {
        // When killed, sleep returns null exit code
        return run('node ./src/main.js -k --success last "echo test" "sleep 1000" ', {pipe: DEBUG_TESTS})
            .then(function(exitCode) {
                assert.notStrictEqual(exitCode, 0);
            });
    });

    it('&& nosuchcmd should return non-zero exit code', () => {
        return run('node ./src/main.js "echo 1 && nosuchcmd" "echo 1 && nosuchcmd" ', {pipe: DEBUG_TESTS})
            .then(function(exitCode) {
                assert.strictEqual(exitCode, 1);
            });
    });

    it('--prefix-colors should handle non-existent colors without failing', () => {
        return run('node ./src/main.js -c "not.a.color" "echo colors"', {pipe: DEBUG_TESTS})
            .then(function(exitCode) {
                assert.strictEqual(exitCode, 0);
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
          pipe: false,
          callback: function(child) {
            var rl = readline.createInterface({
              input: child.stdout,
              output: null
            });

            rl.on('line', function(line) {
              if (DEBUG_TESTS) {
                console.log(line);
              }

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
            });
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
