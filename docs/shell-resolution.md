# Shell Resolution

Each command runs inside a shell, not as a bare executable.
By default, concurrently uses `cmd.exe` on Windows and `/bin/sh` elsewhere.

## Using a different shell

If the default shell isn't suitable, it's possible to instruct concurrently to use a specific shell in a few ways.

This is useful, for example, to use Unix-style syntax (for example `BROWSER=none npm start`) on Windows, if you set concurrently shell to e.g. Git Bash.

### Via explicit override

An explicit shell override takes precedence over every other configuration.
To do that, pass the `--shell` flag to the CLI:

```bash
concurrently --shell "C:\Program Files\Git\bin\bash.exe" "echo Hello world | xargs -n 1 echo"
```

Or via the API:

```js
concurrently(['echo Hello world | xargs -n 1 echo'], {
  shell: 'C:\\Program Files\\Git\\bin\\bash.exe',
});
```

### Via npm/pnpm/yarn v1

When using npm, pnpm or yarn v1 to run concurrently via a `package.json` script, the
[`script-shell` configuration](https://docs.npmjs.com/cli/v6/using-npm/config#script-shell) is inherited and used to spawn commands.

```bash
npm config set script-shell /bin/bash
npm dev # Runs the dev script on bash. Concurrently will also run commands using bash.
```

## Supported shells

If you've specified a different shell, concurrently detects its kind and spawns commands
using the right syntax for that shell.

The following shell types are supported:

- Windows `cmd.exe`
- Powershell
- Any POSIX compliant shells (bash, zsh, dash, etc)
