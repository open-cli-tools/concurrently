var _ = require('lodash');
var assert = require("assert");
var exec = require('child_process').exec;

describe('git-hours', function() {

    describe('cli', function() {

        it('should output json', function(done) {
            exec('node index.js', function(err, stdout, stderr) {
                if (err !== null) {
                    throw new Error(stderr);
                }

                console.log('output json', stdout);
                var work = JSON.parse(stdout);
                assert.notEqual(work.total.hours.length, 0);
                assert.notEqual(work.total.commits.length, 0);

                done();
            });
        });
    });
});
