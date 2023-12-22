# Class: KillOnSignal

Watches the main concurrently process for signals and sends the same signal down to each spawned
command.

## Implements

- [`FlowController`](../interfaces/FlowController.md)

## Table of contents

### Constructors

- [constructor](KillOnSignal.md#constructor)

### Properties

- [process](KillOnSignal.md#process)

### Methods

- [handle](KillOnSignal.md#handle)

## Constructors

### constructor

• **new KillOnSignal**(`«destructured»`)

#### Parameters

| Name             | Type           |
| :--------------- | :------------- |
| `«destructured»` | `Object`       |
| › `process`      | `EventEmitter` |

## Properties

### process

• `Private` `Readonly` **process**: `EventEmitter`

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
