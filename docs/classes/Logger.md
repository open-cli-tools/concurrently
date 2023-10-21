# Class: Logger

## Table of contents

### Constructors

- [constructor](Logger.md#constructor)

### Properties

- [hide](Logger.md#hide)
- [lastChar](Logger.md#lastchar)
- [output](Logger.md#output)
- [prefixFormat](Logger.md#prefixformat)
- [prefixLength](Logger.md#prefixlength)
- [raw](Logger.md#raw)
- [timestampFormat](Logger.md#timestampformat)

### Methods

- [colorText](Logger.md#colortext)
- [emit](Logger.md#emit)
- [getPrefix](Logger.md#getprefix)
- [getPrefixesFor](Logger.md#getprefixesfor)
- [log](Logger.md#log)
- [logCommandEvent](Logger.md#logcommandevent)
- [logCommandText](Logger.md#logcommandtext)
- [logGlobalEvent](Logger.md#logglobalevent)
- [logTable](Logger.md#logtable)
- [shortenText](Logger.md#shortentext)

## Constructors

### constructor

• **new Logger**(`«destructured»`)

#### Parameters

| Name                 | Type                                                                                                               | Description                                                                                     |
| :------------------- | :----------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| `«destructured»`     | `Object`                                                                                                           | -                                                                                               |
| › `hide?`            | [`CommandIdentifier`](../modules.md#commandidentifier) \| [`CommandIdentifier`](../modules.md#commandidentifier)[] | Which command(s) should have their output hidden.                                               |
| › `prefixFormat?`    | `string`                                                                                                           | The prefix format to use when logging a command's output. Defaults to the command's index.      |
| › `prefixLength?`    | `number`                                                                                                           | How many characters should a prefix have at most, used when the prefix format is `command`.     |
| › `raw?`             | `boolean`                                                                                                          | Whether output should be formatted to include prefixes and whether "event" logs will be logged. |
| › `timestampFormat?` | `string`                                                                                                           | Date format used when logging date/time. **`See`** https://date-fns.org/v2.0.1/docs/format      |

## Properties

### hide

• `Private` `Readonly` **hide**: [`CommandIdentifier`](../modules.md#commandidentifier)[]

---

### lastChar

• `Private` `Optional` **lastChar**: `string`

Last character emitted.
If `undefined`, then nothing has been logged yet.

---

### output

• `Readonly` **output**: `Subject`<{ `command`: `undefined` \| [`Command`](Command.md) ; `text`: `string` }\>

Observable that emits when there's been output logged.
If `command` is is `undefined`, then the log is for a global event.

---

### prefixFormat

• `Private` `Optional` `Readonly` **prefixFormat**: `string`

---

### prefixLength

• `Private` `Readonly` **prefixLength**: `number`

---

### raw

• `Private` `Readonly` **raw**: `boolean`

---

### timestampFormat

• `Private` `Readonly` **timestampFormat**: `string`

## Methods

### colorText

▸ **colorText**(`command`, `text`): `string`

#### Parameters

| Name      | Type                    |
| :-------- | :---------------------- |
| `command` | [`Command`](Command.md) |
| `text`    | `string`                |

#### Returns

`string`

---

### emit

▸ **emit**(`command`, `text`): `void`

#### Parameters

| Name      | Type                                   |
| :-------- | :------------------------------------- |
| `command` | `undefined` \| [`Command`](Command.md) |
| `text`    | `string`                               |

#### Returns

`void`

---

### getPrefix

▸ **getPrefix**(`command`): `string`

#### Parameters

| Name      | Type                    |
| :-------- | :---------------------- |
| `command` | [`Command`](Command.md) |

#### Returns

`string`

---

### getPrefixesFor

▸ `Private` **getPrefixesFor**(`command`): `Record`<`string`, `string`\>

#### Parameters

| Name      | Type                    |
| :-------- | :---------------------- |
| `command` | [`Command`](Command.md) |

#### Returns

`Record`<`string`, `string`\>

---

### log

▸ **log**(`prefix`, `text`, `command?`): `void`

#### Parameters

| Name       | Type                    |
| :--------- | :---------------------- |
| `prefix`   | `string`                |
| `text`     | `string`                |
| `command?` | [`Command`](Command.md) |

#### Returns

`void`

---

### logCommandEvent

▸ **logCommandEvent**(`text`, `command`): `void`

Logs an event for a command (e.g. start, stop).

If raw mode is on, then nothing is logged.

#### Parameters

| Name      | Type                    |
| :-------- | :---------------------- |
| `text`    | `string`                |
| `command` | [`Command`](Command.md) |

#### Returns

`void`

---

### logCommandText

▸ **logCommandText**(`text`, `command`): `void`

#### Parameters

| Name      | Type                    |
| :-------- | :---------------------- |
| `text`    | `string`                |
| `command` | [`Command`](Command.md) |

#### Returns

`void`

---

### logGlobalEvent

▸ **logGlobalEvent**(`text`): `void`

Logs a global event (e.g. sending signals to processes).

If raw mode is on, then nothing is logged.

#### Parameters

| Name   | Type     |
| :----- | :------- |
| `text` | `string` |

#### Returns

`void`

---

### logTable

▸ **logTable**(`tableContents`): `void`

Logs a table from an input object array, like `console.table`.

Each row is a single input item, and they are presented in the input order.

#### Parameters

| Name            | Type                             |
| :-------------- | :------------------------------- |
| `tableContents` | `Record`<`string`, `unknown`\>[] |

#### Returns

`void`

---

### shortenText

▸ `Private` **shortenText**(`text`): `string`

#### Parameters

| Name   | Type     |
| :----- | :------- |
| `text` | `string` |

#### Returns

`string`
