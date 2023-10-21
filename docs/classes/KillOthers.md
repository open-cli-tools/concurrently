# Class: KillOthers

Sends a SIGTERM signal to all commands when one of the commands exits with a matching condition.

## Implements

- [`FlowController`](../interfaces/FlowController.md)

## Table of contents

### Constructors

- [constructor](KillOthers.md#constructor)

### Properties

- [conditions](KillOthers.md#conditions)
- [killSignal](KillOthers.md#killsignal)
- [logger](KillOthers.md#logger)

### Methods

- [handle](KillOthers.md#handle)

## Constructors

### constructor

• **new KillOthers**(`«destructured»`)

#### Parameters

| Name             | Type                                                 |
| :--------------- | :--------------------------------------------------- |
| `«destructured»` | `Object`                                             |
| › `conditions`   | `ProcessCloseCondition` \| `ProcessCloseCondition`[] |
| › `killSignal`   | `undefined` \| `string`                              |
| › `logger`       | [`Logger`](Logger.md)                                |

## Properties

### conditions

• `Private` `Readonly` **conditions**: `ProcessCloseCondition`[]

---

### killSignal

• `Private` `Readonly` **killSignal**: `undefined` \| `string`

---

### logger

• `Private` `Readonly` **logger**: [`Logger`](Logger.md)

## Methods

### handle

▸ **handle**(`commands`): `Object`

#### Parameters

| Name       | Type                      |
| :--------- | :------------------------ |
| `commands` | [`Command`](Command.md)[] |

#### Returns

`Object`

| Name       | Type                      |
| :--------- | :------------------------ |
| `commands` | [`Command`](Command.md)[] |

#### Implementation of

[FlowController](../interfaces/FlowController.md).[handle](../interfaces/FlowController.md#handle)
