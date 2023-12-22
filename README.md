# concurrently

[![Latest Release](https://img.shields.io/github/v/release/open-cli-tools/concurrently?label=Release)](https://github.com/open-cli-tools/concurrently/releases)
[![License](https://img.shields.io/github/license/open-cli-tools/concurrently?label=License)](https://github.com/open-cli-tools/concurrently/blob/main/LICENSE)
[![Weekly Downloads on NPM](https://img.shields.io/npm/dw/concurrently?label=Downloads&logo=npm)](https://www.npmjs.com/package/concurrently)
[![CI Status](https://img.shields.io/github/actions/workflow/status/open-cli-tools/concurrently/test.yml?label=CI&logo=github)](https://github.com/open-cli-tools/concurrently/actions/workflows/test.yml)
[![Coverage Status](https://img.shields.io/coveralls/github/open-cli-tools/concurrently/main?label=Coverage&logo=coveralls)](https://coveralls.io/github/open-cli-tools/concurrently?branch=main)

Run multiple commands concurrently.
Like `npm run watch-js & npm run watch-less` but better.

![Demo](assets/demo.gif)

**Table of Contents**

- [concurrently](#concurrently)
  - [Why](#why)
  - [Installation](#installation)
  - [Usage](#usage)
  - [CLI options](#cli-options)
    - [General options](#general)
    - [Styling](#styling)
    - [Input handling](#input-handling)
    - [Killing other processes](#killing-other-processes)
    - [Restarting](#restarting)
  - [API](docs/modules.md)
  - [FAQ](#faq)

## Why

I like [task automation with npm](https://web.archive.org/web/20220531064025/https://github.com/substack/blog/blob/master/npm_run.markdown)
but the usual way to run multiple commands concurrently is
`npm run watch-js & npm run watch-css`. That's fine but it's hard to keep
on track of different outputs. Also if one process fails, others still keep running
and you won't even notice the difference.

Another option would be to just run all commands in separate terminals. I got
tired of opening terminals and made **concurrently**.

**Features:**

- Cross platform (including Windows)
- Output is easy to follow with prefixes
- With `--kill-others` switch, all commands are killed if one dies
- Spawns commands with [spawn-command](https://github.com/mmalecki/spawn-command)

## Installation

**concurrently** can be installed in the global scope (if you'd like to have it available and use it on the whole system) or locally for a specific package (for example if you'd like to use it in the `scripts` section of your package):

|             | npm                     | Yarn                           | pnpm                       | Bun                       |
| ----------- | ----------------------- | ------------------------------ | -------------------------- | ------------------------- |
| **Global**  | `npm i -g concurrently` | `yarn global add concurrently` | `pnpm add -g concurrently` | `bun add -g concurrently` |
| **Local**\* | `npm i -D concurrently` | `yarn add -D concurrently`     | `pnpm add -D concurrently` | `bun add -d concurrently` |

<sub>\* It's recommended to add **concurrently** to `devDependencies` as it's usually used for developing purposes. Please adjust the command if this doesn't apply in your case.</sub>

## Usage

> **Note**
> The `concurrently` command is now also available under the shorthand alias `conc`.

The tool is written in Node.js, but you can use it to run **any** commands.

Remember to surround separate commands with quotes:

```bash
concurrently "command1 arg" "command2 arg"
```

Otherwise **concurrently** would try to run 4 separate commands:
`command1`, `arg`, `command2`, `arg`.

In package.json, escape quotes:

```bash
"start": "concurrently \"command1 arg\" \"command2 arg\""
```

NPM run commands can be shortened:

```bash
concurrently "npm:watch-js" "npm:watch-css" "npm:watch-node"

# Equivalent to:
concurrently -n watch-js,watch-css,watch-node "npm run watch-js" "npm run watch-css" "npm run watch-node"
```

NPM shortened commands also support wildcards. Given the following scripts in
package.json:

```jsonc
{
  //...
  "scripts": {
    // ...
    "watch-js": "...",
    "watch-css": "...",
    "watch-node": "..."
    // ...
  }
  // ...
}
```

```bash
concurrently "npm:watch-*"

# Equivalent to:
concurrently -n js,css,node "npm run watch-js" "npm run watch-css" "npm run watch-node"

# Any name provided for the wildcard command will be used as a prefix to the wildcard
# part of the script name:
concurrently -n w: npm:watch-*

# Equivalent to:
concurrently -n w:js,w:css,w:node "npm run watch-js" "npm run watch-css" "npm run watch-node"
```

Exclusion is also supported. Given the following scripts in package.json:

```jsonc
{
  // ...
  "scripts": {
    "lint:js": "...",
    "lint:ts": "...",
    "lint:fix:js": "...",
    "lint:fix:ts": "..."
    // ...
  }
  // ...
}
```

```bash
# Running only lint:js and lint:ts
#   with lint:fix:js and lint:fix:ts excluded
concurrently "npm:lint:*(!fix)"
```

Good frontend one-liner example [here](https://github.com/kimmobrunfeldt/dont-copy-paste-this-frontend-template/blob/5cd2bde719654941bdfc0a42c6f1b8e69ae79980/package.json#L9).

### CLI options :

```bash
concurrently [options] <command ...>
```

### General

| options                       | description                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-h, --help`                  | Show help                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `-v, -V, --version`           | Show version number                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `-m, --max-processes`         | How many processes should run at once. Exact number or a percent of CPUs available (for example "50%"). New processes only spawn after all restart tries of a process.                                                                                                                                                                                                                                                                              |
| `-n, --names`                 | List of custom names to be used in prefix template.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `--name-separator`            | The character to split <names> on.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ` -s, --success`              | <p> Which command(s) must exit with code 0 in order for concurrently exit with code 0 too.<br> Options are:<br>&emsp;- "first" for the first command to exit;<br>&emsp;- "last" for the last command to exit;<br>&emsp;- "all" for all commands;<br>&emsp;- "command-{name}"/"command-{index}" for the commands with that name or index;<br>&emsp;- "!command-{name}"/"!command-{index}" for all commands but the ones with that name or index.</p> |
| `-r, --raw`                   | Output only raw output of processes, disables prettifying and concurrently coloring.                                                                                                                                                                                                                                                                                                                                                                |
| `--no-color`                  | Disables colors from logging                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `--hide`                      | Comma-separated list of processes to hide the output. The processes can be identified by their name or index.                                                                                                                                                                                                                                                                                                                                       |
| `-g, --group`                 | Order the output as if the commands were run sequentially.                                                                                                                                                                                                                                                                                                                                                                                          |
| `--timings`                   | Show timing information for all processes.                                                                                                                                                                                                                                                                                                                                                                                                          |
| `-P, --passthrough-arguments` | Passthrough additional arguments to commands (accessible via placeholders) instead of treating them as commands.                                                                                                                                                                                                                                                                                                                                    |

### Styling

| options                  | description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-p, --prefix`           | Prefix used in logging for each process <br>Possible values: index, pid, time, command, name, none, or a template.<br>Example template: `"{time}-{pid}"`                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `-c, --prefix-colors`    | Comma-separated list of chalk colors to use on prefixes. If there are more commands than colors, the last color will be repeated.<br>&emsp;- Available modifiers: reset, bold, dim, italic,underline, inverse, hidden, strikethrough<br>&emsp;- Available colors: black, red, green, yellow, blue,magenta, cyan, white, gray,any hex values for colors (e.g. #23de43) or auto for an automatically picked color<br>&emsp;- Available background colors: `bgBlack`, `bgRed`,`bgGreen`, `bgYellow`, `bgBlue`, `bgMagenta`, `bgCyan`, `bgWhite`<br> See https://www.npmjs.com/package/chalk for more information. |
| `-l, --prefix-length`    | Limit how many characters of the command is displayed in prefix. The option can be used to shorten the prefix when it is set to "command"                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `-t, --timestamp-format` | Specify the timestamp in moment/date-fns format.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

### Input handling

| options                  | description                                                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-i, --handle-input`     | Whether input should be forwarded to the child processes. See examples for more information.                                                                    |
| `--default-input-target` | Identifier for child process to which input on stdin should be sent if not specified at start of input. <br>Can be either the index or the name of the process. |

### Killing other processes

| options                 | description                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| ` -k, --kill-others`    | Kill other processes if one exits or dies.                                                     |
| `--kill-others-on-fail` | Kill other processes if one exits with non zero status code.                                   |
| `--kill-signal`         | Signal to send to other processes if one exits or dies. (SIGTERM/SIGKILL, defaults to SIGTERM) |

### Restarting

| options           | description                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `--restart-tries` | How many times a process that died should restart. <br>Negative numbers will make the process restart forever. |
| `--restart-after` | Delay time to respawn the process, in milliseconds.                                                            |

### Examples:

- Output nothing more than stdout+stderr of child processes

```bash
  $ concurrently --raw "npm run watch-less" "npm run watch-js"
```

- Normal output but without colors e.g. when logging to file

```bash
  $ concurrently --no-color "grunt watch" "http-server" > log
```

- Custom prefix

```bash
  $ concurrently --prefix "{time}-{pid}" "npm run watch" "http-server"
```

- Custom names and colored prefixes

```bash
  $ concurrently --names "HTTP,WATCH" -c "bgBlue.bold,bgMagenta.bold"
  "http-server" "npm run watch"
```

- Auto varying colored prefixes

```bash
  $ concurrently -c "auto" "npm run watch" "http-server"
```

- Mixing auto and manual colored prefixes

```bash
  $ concurrently -c "red,auto" "npm run watch" "http-server" "echo hello"
```

- Configuring via environment variables with CONCURRENTLY\_ prefix

```bash
  $ CONCURRENTLY_RAW=true CONCURRENTLY_KILL_OTHERS=true concurrently "echo
  hello" "echo world"
```

- Send input to default

```bash
  $ concurrently --handle-input "nodemon" "npm run watch-js"
  rs # Sends rs command to nodemon process
```

- Send input to specific child identified by index

```bash
  $ concurrently --handle-input "npm run watch-js" nodemon
  1:rs
```

- Send input to specific child identified by name

```bash
  $ concurrently --handle-input -n js,srv "npm run watch-js" nodemon
  srv:rs
```

- Shortened NPM run commands

```bash
  $ concurrently npm:watch-node npm:watch-js npm:watch-css
```

- Shortened NPM run command with wildcard (make sure to wrap it in quotes!)

```bash
  $ concurrently "npm:watch-\*"
```

- Exclude patterns so that between "lint:js" and "lint:fix:js", only "lint:js"
  is ran

```bash
      $ concurrently "npm:*(!fix)"
```

- Passthrough some additional arguments via '{<number>}' placeholder

```bash
  $ concurrently -P "echo {1}" -- foo
```

- Passthrough all additional arguments via '{@}' placeholder

```bash
  $ concurrently -P "npm:dev-\* -- {@}" -- --watch --noEmit
```

- Passthrough all additional arguments combined via '{\*}' placeholder

```bash
  $ concurrently -P "npm:dev-_ -- {_}" -- --watch --noEmit
```

For more details, visit https://github.com/open-cli-tools/concurrently

## FAQ

- Process exited with code _null_?

  From [Node child_process documentation](http://nodejs.org/api/child_process.html#child_process_event_exit), `exit` event:

  > This event is emitted after the child process ends. If the process
  > terminated normally, code is the final exit code of the process,
  > otherwise null. If the process terminated due to receipt of a signal,
  > signal is the string name of the signal, otherwise null.

  So _null_ means the process didn't terminate normally. This will make **concurrently**
  to return non-zero exit code too.

- Does this work with the npm-replacements [yarn](https://github.com/yarnpkg/yarn), [pnpm](https://pnpm.js.org/), or [Bun](https://bun.sh/)?

  Yes! In all examples above, you may replace "`npm`" with "`yarn`", "`pnpm`", or "`bun`".
