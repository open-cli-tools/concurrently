# Class: RestartProcess

Restarts commands that fail up to a defined number of times.

## Implements

- [`FlowController`](../interfaces/FlowController.md)

## Table of contents

### Constructors

- [constructor](RestartProcess.md#constructor)

### Properties

- [delay](RestartProcess.md#delay)
- [logger](RestartProcess.md#logger)
- [scheduler](RestartProcess.md#scheduler)
- [tries](RestartProcess.md#tries)

### Methods

- [handle](RestartProcess.md#handle)

## Constructors

### constructor

• **new RestartProcess**(`«destructured»`)

#### Parameters

| Name             | Type                  |
| :--------------- | :-------------------- |
| `«destructured»` | `Object`              |
| › `delay?`       | `number`              |
| › `logger`       | [`Logger`](Logger.md) |
| › `scheduler?`   | `SchedulerLike`       |
| › `tries?`       | `number`              |

## Properties

### delay

• `Readonly` **delay**: `number`

---

### logger

• `Private` `Readonly` **logger**: [`Logger`](Logger.md)

---

### scheduler

• `Private` `Optional` `Readonly` **scheduler**: `SchedulerLike`

---

### tries

• `Readonly` **tries**: `number`

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
