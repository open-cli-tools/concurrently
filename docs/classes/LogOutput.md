# Class: LogOutput

Logs the stdout and stderr output of commands.

## Implements

- [`FlowController`](../interfaces/FlowController.md)

## Table of contents

### Constructors

- [constructor](LogOutput.md#constructor)

### Properties

- [logger](LogOutput.md#logger)

### Methods

- [handle](LogOutput.md#handle)

## Constructors

### constructor

• **new LogOutput**(`«destructured»`)

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
