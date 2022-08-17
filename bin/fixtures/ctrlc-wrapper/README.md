# `ctrlc-wrapper`

Windows doesn't support sending signals to other processes as it is possible on POSIX platforms.

Using kill methods on Windows (like `process.kill()` with Node.js) means the target process is getting killed forcefully and abruptly (similar to `SIGKILL`).

However, in a console, processes can be terminated with the `CTRL`+`C` key combination.  
Most programming languages have an implementation to capture this signal (usually as `SIGINT`), allowing applications to handle it and to terminate "gracefully".

The problem is that the `CTRL`+`C` key combination cannot be easily simulated for the following reasons:

- In order to be able to generate a CTRL+C signal programmatically, several [Console Functions](https://docs.microsoft.com/en-us/windows/console/console-functions) needs to be called - something which can only be done in lower-level programming languages.
- The process which should receive the CTRL+C signal needs to live in its own console since the CTRL+C signal is sent to all processes attached to a console. Spawning a process in a new console, again, is something which is only possible in lower-level programming languages.

This wrapper application does exactly the points described above.

## Usage

To start the child process `node ../read-echo.js` with the wrapper:

```console
start.exe node ../read-echo.js
```

To terminate:

- Press `CTRL`+`C`
- Write `^C` to `stdin`
- Exit from within the child

The wrapper inherits the exit code from the child process. If there's an error with the wrapper itself, the exit code is `-1`.

## Test

On Windows:

```console
go run ./cmd/start node ../read-echo.js
```

## Build

```console
GOOS=windows GOARCH=amd64 go build ./cmd/ctrlc
GOOS=windows GOARCH=amd64 go build ./cmd/start
```

## Notes

Notes for future me and interested parties:

### Why the separate `ctrlc.exe` binary?

Initially, I've tried to send the CTRL+C signal directly from within `start.exe`, but this resulted in loss of some output from the child process (during `FreeConsole` -> `AttachConsole`). There might be a workaround for this...

### `CREATE_NEW_CONSOLE` vs. `CREATE_NEW_PROCESS_GROUP`

Both methods seems to protect from receiving the CTRL+C signal in the current console.

However, spawning the child with `CREATE_NEW_PROCESS_GROUP` would mean that we need to start another "wrapper" in which the "normal processing of CTRL+C input" is enabled first (via `SetConsoleCtrlHandler`) before starting the actual child process.

### `CreateRemoteThread`

Instead of `ctrlc.exe` we might be able to terminate the target process by inject a thread into it, but this seems to be overly complicated.

## Author

- [paescuj](https://github.com/paescuj)
