# Class: InputHandler

Sends input from concurrently through to commands.

Input can start with a command identifier, in which case it will be sent to that specific command.
For instance, `0:bla` will send `bla` to command at index `0`, and `server:stop` will send `stop`
to command with name `server`.

If the input doesn't start with a command identifier, it is then always sent to the default target.

## Implements

- [`FlowController`](../interfaces/FlowController.md)

## Table of contents

### Constructors

- [constructor](InputHandler.md#constructor)

### Properties

- [defaultInputTarget](InputHandler.md#defaultinputtarget)
- [inputStream](InputHandler.md#inputstream)
- [logger](InputHandler.md#logger)
- [pauseInputStreamOnFinish](InputHandler.md#pauseinputstreamonfinish)

### Methods

- [handle](InputHandler.md#handle)

## Constructors

### constructor

• **new InputHandler**(`«destructured»`)

#### Parameters

| Name                          | Type                                                   |
| :---------------------------- | :----------------------------------------------------- |
| `«destructured»`              | `Object`                                               |
| › `defaultInputTarget?`       | [`CommandIdentifier`](../modules.md#commandidentifier) |
| › `inputStream?`              | `Readable`                                             |
| › `logger`                    | [`Logger`](Logger.md)                                  |
| › `pauseInputStreamOnFinish?` | `boolean`                                              |

## Properties

### defaultInputTarget

• `Private` `Readonly` **defaultInputTarget**: [`CommandIdentifier`](../modules.md#commandidentifier)

---

### inputStream

• `Private` `Optional` `Readonly` **inputStream**: `Readable`

---

### logger

• `Private` `Readonly` **logger**: [`Logger`](Logger.md)

---

### pauseInputStreamOnFinish

• `Private` `Readonly` **pauseInputStreamOnFinish**: `boolean`

## Methods

### handle

▸ **handle**(`commands`): `Object`

#### Parameters

| Name       | Type                      |
| :--------- | :------------------------ |
| `commands` | [`Command`](Command.md)[] |

#### Returns

`Object`

| Name        | Type                        |
| :---------- | :-------------------------- |
| `commands`  | [`Command`](Command.md)[]   |
| `onFinish?` | () => `undefined` \| `void` |

#### Implementation of

[FlowController](../interfaces/FlowController.md).[handle](../interfaces/FlowController.md#handle)
