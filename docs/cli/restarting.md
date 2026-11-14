# Restarting Commands

Sometimes it's useful to have commands that exited with a non-zero status to restart automatically.<br/>
concurrently lets you configure how many times you wish for such a command to restart through the `--restart-tries` flag:

```bash
$ concurrently --restart-tries 2 'exit 1'
[0] exit 1 exited with code 1
[0] exit 1 restarted
[0] exit 1 exited with code 1
[0] exit 1 restarted
[0] exit 1 exited with code 1
```

Sometimes, it might be interesting to have commands wait before restarting.<br/>
To do this, simply set `--restart-after` to a the number of milliseconds you'd like to delay restarting.

```bash
$ concurrently -p time --restart-tries 1 --restart-after 3000 'exit 1'
[2024-09-01 23:43:55.871] exit 1 exited with code 1
[2024-09-01 23:43:58.874] exit 1 restarted
[2024-09-01 23:43:58.891] exit 1 exited with code 1
```

If a command is not having success spawning, you might want to instead apply an exponential back-off.<br/>
Set `--restart-after exponential` to have commands respawn with a `2^N` seconds delay.

```bash
$ concurrently -p time --restart-tries 3 --restart-after exponential 'exit 1'

[2024-09-01 23:49:01.124] exit 1 exited with code 1
[2024-09-01 23:49:02.127] exit 1 restarted
[2024-09-01 23:49:02.139] exit 1 exited with code 1
[2024-09-01 23:49:04.141] exit 1 restarted
[2024-09-01 23:49:04.157] exit 1 exited with code 1
[2024-09-01 23:49:08.158] exit 1 restarted
[2024-09-01 23:49:08.174] exit 1 exited with code 1
```

## Limiting restarts across all commands

`--restart-tries` applies to each command on its own. When commands are coupled, for example
with [`--kill-others`](./killing-others.md), a command that runs out of retries tears down the
others, and those are then restarted by their own (still unused) retries, so the run never ends.

Set `--total-restart-tries` to put a shared budget on top of `--restart-tries`. Every restart of
any command consumes it, and once it's gone, no command is restarted again:

```bash
# "foo.js 0" dies immediately and is retried twice; after the last try it kills "foo.js 1",
# which is not restarted because the shared budget is already spent.
$ concurrently --restart-tries 2 --total-restart-tries 2 --kill-others 'node foo.js 0' 'node foo.js 1'
```

Both limits apply: a command is restarted only while it has tries of its own left and the shared
budget still has restarts left. Negative values mean no limit, which is the default.
