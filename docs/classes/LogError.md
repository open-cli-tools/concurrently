# Class: LogError

Logs when commands failed executing, e.g. due to the executable not existing in the system.

## Implements

- [`FlowController`](../interfaces/FlowController.md)

## Table of contents

### Constructors

- [constructor](LogError.md#constructor)

### Properties

- [logger](LogError.md#logger)

### Methods

- [handle](LogError.md#handle)

## Constructors

### constructor

• **new LogError**(`«destructured»`)

#### Parameters

| Name             | Type                  |
| :--------------- | :-------------------- |
| `«destructured»` | `Object`              |
| › `logger`       | [`Logger`](Logger.md) |

## Properties

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
