# Concurrently API documentation

## Table of contents

### Classes

- [Command](classes/Command.md)
- [InputHandler](classes/InputHandler.md)
- [KillOnSignal](classes/KillOnSignal.md)
- [KillOthers](classes/KillOthers.md)
- [LogError](classes/LogError.md)
- [LogExit](classes/LogExit.md)
- [LogOutput](classes/LogOutput.md)
- [LogTimings](classes/LogTimings.md)
- [Logger](classes/Logger.md)
- [RestartProcess](classes/RestartProcess.md)

### Interfaces

- [CloseEvent](interfaces/CloseEvent.md)
- [FlowController](interfaces/FlowController.md)
- [TimerEvent](interfaces/TimerEvent.md)

### Type Aliases

- [CommandIdentifier](modules.md#commandidentifier)
- [ConcurrentlyCommandInput](modules.md#concurrentlycommandinput)
- [ConcurrentlyOptions](modules.md#concurrentlyoptions)
- [ConcurrentlyResult](modules.md#concurrentlyresult)

### Functions

- [concurrently](modules.md#concurrently)
- [default](modules.md#default)

## Type Aliases

### CommandIdentifier

Ƭ **CommandIdentifier**: `string` \| `number`

Identifier for a command; if string, it's the command's name, if number, it's the index.

---

### ConcurrentlyCommandInput

Ƭ **ConcurrentlyCommandInput**: `string` \| { `command`: `string` } & `Partial`<`CommandInfo`\>

A command that is to be passed into `concurrently()`.
If value is a string, then that's the command's command line.
Fine grained options can be defined by using the object format.

---

### ConcurrentlyOptions

Ƭ **ConcurrentlyOptions**: `BaseConcurrentlyOptions` & { `additionalArguments?`: `string`[] ; `defaultInputTarget?`: [`CommandIdentifier`](modules.md#commandidentifier) ; `handleInput?`: `boolean` ; `hide?`: [`CommandIdentifier`](modules.md#commandidentifier) \| [`CommandIdentifier`](modules.md#commandidentifier)[] ; `inputStream?`: `Readable` ; `killOthers?`: `ProcessCloseCondition` \| `ProcessCloseCondition`[] ; `pauseInputStreamOnFinish?`: `boolean` ; `prefix?`: `string` ; `prefixLength?`: `number` ; `raw?`: `boolean` ; `restartDelay?`: `number` ; `restartTries?`: `number` ; `timestampFormat?`: `string` ; `timings?`: `boolean` }

Logger options

---

### ConcurrentlyResult

Ƭ **ConcurrentlyResult**: `Object`

#### Type declaration

| Name       | Type                                                   | Description                                                                                                                                                                                                   |
| :--------- | :----------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `commands` | [`Command`](classes/Command.md)[]                      | All commands created and ran by concurrently.                                                                                                                                                                 |
| `result`   | `Promise`<[`CloseEvent`](interfaces/CloseEvent.md)[]\> | A promise that resolves when concurrently ran successfully according to the specified success condition, or reject otherwise. Both the resolved and rejected value is the list of all command's close events. |

## Functions

### concurrently

▸ **concurrently**(`baseCommands`, `baseOptions?`): [`ConcurrentlyResult`](modules.md#concurrentlyresult)

Core concurrently functionality -- spawns the given commands concurrently and
returns the commands themselves + the result according to the specified success condition.

#### Parameters

| Name           | Type                                                                |
| :------------- | :------------------------------------------------------------------ |
| `baseCommands` | [`ConcurrentlyCommandInput`](modules.md#concurrentlycommandinput)[] |
| `baseOptions?` | `Partial`<`ConcurrentlyOptions`\>                                   |

#### Returns

[`ConcurrentlyResult`](modules.md#concurrentlyresult)

**`See`**

CompletionListener

---

### default

▸ **default**(`commands`, `options?`): [`ConcurrentlyResult`](modules.md#concurrentlyresult)

#### Parameters

| Name       | Type                                                                |
| :--------- | :------------------------------------------------------------------ |
| `commands` | [`ConcurrentlyCommandInput`](modules.md#concurrentlycommandinput)[] |
| `options`  | `Partial`<[`ConcurrentlyOptions`](modules.md#concurrentlyoptions)\> |

#### Returns

[`ConcurrentlyResult`](modules.md#concurrentlyresult)
