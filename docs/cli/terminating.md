# Terminating Commands

It's possible to have concurrently terminate other commands when one of them exits.<br/>
This can be done in the following ways:

## Terminating on either success or error

By using the `--kill-others` flag, concurrently will terminate other commands once the first one exits,
no matter the exit code.<br/>
This is useful to terminate the server process once the test is done.

```bash
$ concurrently --kill-others --names server,test 'npm start' 'npm test'
```

## Terminating on error only

By using the `--kill-others-on-fail` flag, concurrently will terminate other commands any command
exits with a non-zero code.<br/>
This is useful if you're building multiple applications, and you want to abort the others once you know
that any of them is broken.

```bash
$ concurrently --kill-others-on-fail 'npm run app1:build' 'npm run app2:build'
```

## Configuring termination

### Kill Signal

It's possible to configure which signal you want to send when terminating commands with the `--kill-signal` flag.
The default is `SIGTERM`, but it's also possible to send `SIGKILL`.

```bash
$ concurrently --kill-others --kill-signal SIGKILL 'npm start' 'npm test'
```
