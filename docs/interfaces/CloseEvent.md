# Interface: CloseEvent

## Table of contents

### Properties

- [command](CloseEvent.md#command)
- [exitCode](CloseEvent.md#exitcode)
- [index](CloseEvent.md#index)
- [killed](CloseEvent.md#killed)
- [timings](CloseEvent.md#timings)

## Properties

### command

• **command**: `CommandInfo`

---

### exitCode

• **exitCode**: `string` \| `number`

The exit code or signal for the command.

---

### index

• **index**: `number`

The command's index among all commands ran.

---

### killed

• **killed**: `boolean`

Whether the command exited because it was killed.

---

### timings

• **timings**: `Object`

#### Type declaration

| Name              | Type     |
| :---------------- | :------- |
| `durationSeconds` | `number` |
| `endDate`         | `Date`   |
| `startDate`       | `Date`   |
