# Environment Variables

Commands can be given extra environment variables with the `--env` flag, in `KEY=VALUE` format.<br/>
It works the same way on every platform, so there's no need to prefix each command with tools like `cross-env`.

```bash
$ concurrently --env GREETING=hello 'node -p process.env.GREETING' 'node -p process.env.GREETING'
[0] hello
[1] hello
[0] node -p process.env.GREETING exited with code 0
[1] node -p process.env.GREETING exited with code 0
```

The flag can be specified multiple times to set more than one variable:

```bash
$ concurrently --env NODE_ENV=production --env PORT=3000 'npm:start-*'
```

These variables apply to every command, including the ones passed to `--teardown`, and are set on top of the
environment that concurrently itself was started with.
Only the first `=` separates the name from the value, so values like `--env URL=http://localhost?a=b` work as expected.

> [!NOTE]
> These are different from the `CONCURRENTLY_` prefixed environment variables, which configure concurrently itself.
> See [Configuration](./configuration.md).
