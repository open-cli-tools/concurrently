# Output Control

concurrently offers a few ways to control a command's output.

## Hiding

A command's outputs (and all its events) can be hidden by using the `--hide` flag.

```bash
$ concurrently --hide 0 'echo Hello there' 'echo General Kenobi!'
[1] General Kenobi!
[1] echo 'General Kenobi!' exited with code 0
```

## Showing

When many commands run, it can be easier to name the ones you want to see instead of listing every other index in `--hide`. Use `--show` to whitelist output by name or index. Every command still runs; only the output is filtered.

```bash
$ concurrently --show 1 'echo Hello there' 'echo General Kenobi!'
[1] General Kenobi!
[1] echo 'General Kenobi!' exited with code 0
```

If both `--show` and `--hide` are set, a command is shown only when it is listed in `--show` and not listed in `--hide`.

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
