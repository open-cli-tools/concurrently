# Class: LogExit

Logs the exit code/signal of commands.

## Implements

- [`FlowController`](../interfaces/FlowController.md)

## Table of contents

### Constructors

- [constructor](LogExit.md#constructor)

### Properties

- [logger](LogExit.md#logger)

### Methods

- [handle](LogExit.md#handle)

## Constructors

### constructor

• **new LogExit**(`«destructured»`)

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
