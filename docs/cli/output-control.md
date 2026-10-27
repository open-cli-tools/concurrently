# Output Control

concurrently offers a few ways to control a command's output.

## Hiding

A command's outputs (and all its events) can be hidden by using the `--hide` flag.

```bash
$ concurrently --hide 0 'echo Hello there' 'echo General Kenobi!'
[1] General Kenobi!
[1] echo 'General Kenobi!' exited with code 0
```

## Preventing Clearing

Some commands clear the terminal, for example when restarting in watch mode, which also wipes the output of every other command.<br/>
The escape sequences used to clear the terminal can be removed from the output of all commands by using the `--prevent-clear` flag.

```bash
$ concurrently --prevent-clear 'tsc --watch' 'node --watch server.js'
```

This flag has no effect in raw mode, as concurrently doesn't process the output of commands in that mode.

## Grouping

It might be useful at times to make sure that the commands outputs are grouped together, while running them in parallel.<br/>
This can be done with the `--group` flag.

```bash
$ concurrently --group 'echo Hello there && sleep 2 && echo General Kenobi!' 'echo hi Star Wars fans'
[0] Hello there
[0] General Kenobi!
[0] echo Hello there && sleep 2 && echo 'General Kenobi!' exited with code 0
[1] hi Star Wars fans
[1] echo hi Star Wars fans exited with code 0
```

## No Colors

When piping concurrently's outputs to another command or file, you might want to force it to not use colors, as these can break the other command's parsing, or reduce the legibility of the output in non-terminal environments.

```bash
$ concurrently -c red,blue --no-color 'echo Hello there' 'echo General Kenobi!'
```
