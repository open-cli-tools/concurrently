# Interface: FlowController

Interface for a class that controls and/or watches the behavior of commands.

This may include logging their output, creating interactions between them, or changing when they
actually finish.

## Implemented by

- [`InputHandler`](../classes/InputHandler.md)
- [`KillOnSignal`](../classes/KillOnSignal.md)
- [`KillOthers`](../classes/KillOthers.md)
- [`LogError`](../classes/LogError.md)
- [`LogExit`](../classes/LogExit.md)
- [`LogOutput`](../classes/LogOutput.md)
- [`LogTimings`](../classes/LogTimings.md)
- [`RestartProcess`](../classes/RestartProcess.md)

## Table of contents

### Methods

- [handle](FlowController.md#handle)

## Methods

### handle

▸ **handle**(`commands`): `Object`

#### Parameters

| Name       | Type                                 |
| :--------- | :----------------------------------- |
| `commands` | [`Command`](../classes/Command.md)[] |

#### Returns

`Object`

| Name        | Type                                 |
| :---------- | :----------------------------------- |
| `commands`  | [`Command`](../classes/Command.md)[] |
| `onFinish?` | () => `void`                         |
