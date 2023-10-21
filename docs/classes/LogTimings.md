# Class: LogTimings

Logs timing information about commands as they start/stop and then a summary when all commands finish.

## Implements

- [`FlowController`](../interfaces/FlowController.md)

## Table of contents

### Constructors

- [constructor](LogTimings.md#constructor)

### Properties

- [logger](LogTimings.md#logger)
- [timestampFormat](LogTimings.md#timestampformat)

### Methods

- [handle](LogTimings.md#handle)
- [printExitInfoTimingTable](LogTimings.md#printexitinfotimingtable)
- [mapCloseEventToTimingInfo](LogTimings.md#mapcloseeventtotiminginfo)

## Constructors

### constructor

• **new LogTimings**(`«destructured»`)

#### Parameters

| Name                 | Type                  |
| :------------------- | :-------------------- |
| `«destructured»`     | `Object`              |
| › `logger?`          | [`Logger`](Logger.md) |
| › `timestampFormat?` | `string`              |

## Properties

### logger

• `Private` `Optional` `Readonly` **logger**: [`Logger`](Logger.md)

---

### timestampFormat

• `Private` `Readonly` **timestampFormat**: `string`

## Methods

### handle

▸ **handle**(`commands`): { `commands`: [`Command`](Command.md)[] ; `onFinish?`: `undefined` } \| { `commands`: [`Command`](Command.md)[] ; `onFinish`: () => `void` }

#### Parameters

| Name       | Type                      |
| :--------- | :------------------------ |
| `commands` | [`Command`](Command.md)[] |

#### Returns

{ `commands`: [`Command`](Command.md)[] ; `onFinish?`: `undefined` } \| { `commands`: [`Command`](Command.md)[] ; `onFinish`: () => `void` }

#### Implementation of

[FlowController](../interfaces/FlowController.md).[handle](../interfaces/FlowController.md#handle)

---

### printExitInfoTimingTable

▸ `Private` **printExitInfoTimingTable**(`exitInfos`): [`CloseEvent`](../interfaces/CloseEvent.md)[]

#### Parameters

| Name        | Type                                          |
| :---------- | :-------------------------------------------- |
| `exitInfos` | [`CloseEvent`](../interfaces/CloseEvent.md)[] |

#### Returns

[`CloseEvent`](../interfaces/CloseEvent.md)[]

---

### mapCloseEventToTimingInfo

▸ `Static` **mapCloseEventToTimingInfo**(`«destructured»`): `TimingInfo`

#### Parameters

| Name             | Type                                        |
| :--------------- | :------------------------------------------ |
| `«destructured»` | [`CloseEvent`](../interfaces/CloseEvent.md) |

#### Returns

`TimingInfo`
