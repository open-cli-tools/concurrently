# Class: Command

## Implements

- `CommandInfo`

## Table of contents

### Constructors

- [constructor](Command.md#constructor)

### Properties

- [close](Command.md#close)
- [command](Command.md#command)
- [cwd](Command.md#cwd)
- [env](Command.md#env)
- [error](Command.md#error)
- [exited](Command.md#exited)
- [index](Command.md#index)
- [killProcess](Command.md#killprocess)
- [killed](Command.md#killed)
- [name](Command.md#name)
- [pid](Command.md#pid)
- [prefixColor](Command.md#prefixcolor)
- [process](Command.md#process)
- [spawn](Command.md#spawn)
- [spawnOpts](Command.md#spawnopts)
- [stderr](Command.md#stderr)
- [stdin](Command.md#stdin)
- [stdout](Command.md#stdout)
- [timer](Command.md#timer)

### Accessors

- [killable](Command.md#killable)

### Methods

- [kill](Command.md#kill)
- [start](Command.md#start)
- [canKill](Command.md#cankill)

## Constructors

### constructor

• **new Command**(`«destructured»`, `spawnOpts`, `spawn`, `killProcess`)

#### Parameters

| Name             | Type                                  |
| :--------------- | :------------------------------------ |
| `«destructured»` | `CommandInfo` & { `index`: `number` } |
| `spawnOpts`      | `SpawnOptions`                        |
| `spawn`          | `SpawnCommand`                        |
| `killProcess`    | `KillProcess`                         |

## Properties

### close

• `Readonly` **close**: `Subject`<[`CloseEvent`](../interfaces/CloseEvent.md)\>

---

### command

• `Readonly` **command**: `string`

**`Inherit Doc`**

#### Implementation of

CommandInfo.command

---

### cwd

• `Optional` `Readonly` **cwd**: `string`

**`Inherit Doc`**

#### Implementation of

CommandInfo.cwd

---

### env

• `Readonly` **env**: `Record`<`string`, `unknown`\>

**`Inherit Doc`**

#### Implementation of

CommandInfo.env

---

### error

• `Readonly` **error**: `Subject`<`unknown`\>

---

### exited

• **exited**: `boolean` = `false`

---

### index

• `Readonly` **index**: `number`

---

### killProcess

• `Private` `Readonly` **killProcess**: `KillProcess`

---

### killed

• **killed**: `boolean` = `false`

---

### name

• `Readonly` **name**: `string`

**`Inherit Doc`**

#### Implementation of

CommandInfo.name

---

### pid

• `Optional` **pid**: `number`

---

### prefixColor

• `Optional` `Readonly` **prefixColor**: `string`

**`Inherit Doc`**

#### Implementation of

CommandInfo.prefixColor

---

### process

• `Optional` **process**: `ChildProcess`

---

### spawn

• `Private` `Readonly` **spawn**: `SpawnCommand`

---

### spawnOpts

• `Private` `Readonly` **spawnOpts**: `SpawnOptions`

---

### stderr

• `Readonly` **stderr**: `Subject`<`Buffer`\>

---

### stdin

• `Optional` **stdin**: `Writable`

---

### stdout

• `Readonly` **stdout**: `Subject`<`Buffer`\>

---

### timer

• `Readonly` **timer**: `Subject`<[`TimerEvent`](../interfaces/TimerEvent.md)\>

## Accessors

### killable

• `get` **killable**(): `boolean`

#### Returns

`boolean`

**`Deprecated`**

## Methods

### kill

▸ **kill**(`code?`): `void`

Kills this command, optionally specifying a signal to send to it.

#### Parameters

| Name    | Type     |
| :------ | :------- |
| `code?` | `string` |

#### Returns

`void`

---

### start

▸ **start**(): `void`

Starts this command, piping output, error and close events onto the corresponding observables.

#### Returns

`void`

---

### canKill

▸ `Static` **canKill**(`command`): command is Command & Object

Detects whether a command can be killed.

Also works as a type guard on the input `command`.

#### Parameters

| Name      | Type                    |
| :-------- | :---------------------- |
| `command` | [`Command`](Command.md) |

#### Returns

command is Command & Object
