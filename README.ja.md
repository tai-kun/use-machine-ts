# use-machine-ts

**The tiny _state machine_ hook for React**

[![CI](https://github.com/tai-kun/use-machine-ts/actions/workflows/ci.yaml/badge.svg)](https://github.com/tai-kun/use-machine-ts/actions/workflows/ci.yaml)
[![Release on NPM](https://github.com/tai-kun/use-machine-ts/actions/workflows/release.yaml/badge.svg)](https://github.com/tai-kun/use-machine-ts/actions/workflows/release.yaml)
[![Canary Release on NPM](https://github.com/tai-kun/use-machine-ts/actions/workflows/canary-release.yaml/badge.svg)](https://github.com/tai-kun/use-machine-ts/actions/workflows/canary-release.yaml)

[![npm bundle size](https://img.shields.io/bundlephobia/minzip/use-machine-ts/latest)](https://bundlephobia.com/package/use-machine-ts)
[![npm version](https://img.shields.io/npm/v/use-machine-ts)](https://www.npmjs.com/package/use-machine-ts)
[![npm canary version](https://img.shields.io/npm/v/use-machine-ts/canary)](https://www.npmjs.com/package/use-machine-ts?activeTab=versions)

[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](https://opensource.org/licenses/MIT)

<p align="center"><a href="./README.md">English (MT)</a> | 日本語</p>

use-machine-ts は React でステートマシンをデザインするための小さなフックです。すでに慣れ親しんでいる慣用的な React のパターンに従い、状態遷移を簡単に管理できます。

<details>
  <summary>ファイルサイズ</summary>

  | source | min+brotli |
  | :-- | --: |
  | `import { useMachine } from "use-machine-ts"` | 973 B |
  | `import * from "use-machine-ts"`              | 1.37 KB |
  | `import * from "use-machine-ts/standard"`     | 1 KB |
  | `import * from "use-machine-ts/shared"`       | 1.04 KB |
  | `import * from "use-machine-ts/synced"`       | 1.08 KB |
  |||
  | `import { createMachine } from "xstate@5.9.1"` & `import { useMachine } from "@xstate/react@4.1.0"`  | 11.12 KB |
</details>

## Respect

use-machine-ts は [@cassiozen/usestatemachine](https://github.com/cassiozen/useStateMachine) に触発されています。

<details>
  <summary>use-machine-ts と @cassiozen/usestatemachine の違い</summary>

  - ステートマシンの定義は 1 つから 2 つに分割されています。分離された項目はデバッグに関する設定と、ガード関数とエフェクト関数の実体です。状態遷移の定義の中に実装が含まれないため、次の恩恵を得られます。
    - 状態遷移の熟慮により集中できます。
    - 状態遷移がガードされたときのログが明確になり、デバッグが容易になります。 (参照: [Using Guards](#using-guards))
  - コンテキストとイベントの型定義のための特別な関数 `t` が必要ありません。
  - ステートマシンを事前に作成することができます。
  - 非同期的なステートマシンの状態更新が比較的安全になりました。具体的には、コンポーネントがすでにアンマウントされている状態での動作が改善されました。 (参照: [Async Orchestration](#async-orchestration))
  - `useMachine` 以外にも、2 つの便利なフックが提供されています。
    - `useSharedMachine`: 複数の React コンポーネントの間で状態を共有することができます。また、React コンポーネントの外側から状態遷移を管理することもできます。
    - `useSyncedMachine`: 状態が遷移するたびに再レンダリングがトリガーされることはありません。このフックは現在の状態ではなく、状態のスナップショットを返す関数提供します。
  - 😢 必要な React のバージョンは 16.8 から、18 に引き上げられています。
  - 😢 ファイルサイズが増加しました。`useMachine` を比較すると、約 400 バイト (+60%) の増加です。
</details>

## Basic Features

- useMachine: 本質的には `useState` と `useEffect` のラッパーです。`useState` と同じように、状態遷移を管理します。
- useSharedMachine: 本質的には `usuSyncExternalState` と `useEffect` のラッパーです。複数の React コンポーネントの間で状態を共有することができます。また、React コンポーネントの外側から状態遷移を管理することもできます。
- useSyncedMachine: useMachine と似ていますが、状態が遷移するたびに再レンダリングがトリガーされることはありません。このフックは現在の状態ではなく、状態のスナップショットを返す関数提供します。
- createMachine: ステートマシンを作成します。State Machine Definitionを異なるコンポーネントで使いまわすのに便利です。useMachine と useSyncedMachine で使用できます。
- createSharedMachine: createMachine と似ていますが、useSharedMachine でのみ使用できます。

## Installation

最新の安定版をインストールするには:

```sh
npm install use-machine-ts
```

Canary バージョンをインストールするには:

```sh
npm install use-machine-ts@canary
```

## Sample Usage

```ts
import { useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  {
    initial: "inactive",
    states: {
      inactive: {
        on: {
          TOGGLE: {
            target: "active",
            guard: "isReady",
          },
        },
      },
      active: {
        on: { TOGGLE: "inactive" },
        effect: "onActive",
      },
    },
  },
  {
    guards: {
      isReady: () => true,
    },
    effects: {
      onActive: () => {
        console.log("「アクティブ」状態に入りました！")

        return () => {
          console.log("「アクティブ」状態から出ました！")
        }
      },
    },
  },
)

console.log(state)
// { value: "inactive", context: undefined,
//   event: { type: "$init" }, nextEvents: ["TOGGLE"] }

send("TOGGLE")
// Logs: 「アクティブ」状態に入りました！

console.log(state)
// { value: "active", context: undefined,
//   event: { type: "TOGGLE" }, nextEvents: ["TOGGLE"] }
```

## TODO

- [x] 基本的な機能を実装する。
- [ ] 一部の不完全なテストを修正する。
- [ ] `preact/compat` でもテストする。
- [ ] React v19 との互換性を確認する。

## Contents

- [API](#api)
  - [useMachine](#usemachine)
    - [state](#state)
    - [send](#send)
    - [State Machine Definition](#state-machine-definition)
    - [Defining States](#defining-states)
    - [Using Guards](#using-guards)
    - [Using Effects](#using-effects)
    - [Extended State](#extended-state)
    - [Schema](#Schema)
    - [Logging](#logging)
  - [useSharedMachine](#usesharedmachine)
  - [useSyncedMachine](#usesyncedmachine)
- [Async Orchestration](#async-orchestration)
  - [useMachine](#usemachine-1)
  - [useSharedMachine](#usesharedmachine-1)
  - [useSyncedMachine](#usesyncedmachine-1)

# API

## useMachine

即席のステートマシンを作成するには:

```ts
import { useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  /* State Machine Definition */,
  /* State Machine Configuration (Optional) */,
)
```

事前に作成したステートマシンを使用するには:

```ts
import { useMachine, createMachine } from "use-machine-ts"

const machine = /* @__PURE__ */ createMachine(
  /* State Machine Definition */,
  /* State Machine Configuration (Optional) */,
)

const [state, send] = useMachine(machine)
```

または:

```ts
import { useMachine, createMachine } from "use-machine-ts"

function machine() {
  return createMachine(
    /* State Machine Definition */,
    /* State Machine Configuration (Optional) */,
  )
}

const [state, send] = useMachine(machine)
```

### state

ステートマシンの `state` は、`value`、`event`、`nextEvents`、`context` の 4 つのプロパティで構成されます。

| プロパティ | 型 | 説明 |
| :-- | :-- | :-- |
| `value` | `string` | 現在の状態です。例えば `"inactive"` や `"active"` などです。 |
| `event` | `object` | 現在の状態を引き起こした最後に送信されたイベントです。例えば `{ type: "TOGGLE" }` などです。ただし、最初は `{ type: "$init" }` です。 |
| `nextEvents` | `string[]` | 現在の状態で送信できるイベントのリストです。例えば `["TOGGLE"]` などです。 |
| `context` | `any` | ステートマシンの拡張された状態です。[Extended State](#extended-state) を参照してください。 |

### send

`send` 関数は、ステートマシンにイベントを送信するために使用します。1 つの引数を取り、イベントの型を表す文字列 (例: `"TOGGLE"`) またはオブジェクト (例: `{ type: "TOGGLE" }`) を渡します。

現在の状態がイベントを受理し、遷移が可能である場合 ([Guards](#using-guards) を参照)、ステートマシンの状態が更新され、関連するエフェクト ([Effects](#using-effects) を参照) が実行されます。

オブジェクト形式のエベントを使用して、追加のデータを送信することができます (例: `{ type: "TOGGLE", value: 10 }`)。イベントの型を定義する方法については [Schema](#schema) を参照してください。

### State Machine Definition

| プロパティ | 型 | 必須 | 説明 |
| :-- | :-- | :-- | :-- |
| `initial` | `string` | ✅ | ステートマシンの初期状態を定義します。 |
| `states` | `object` | ✅ | ステートマシンが取り得る有限状態を定義します。 (参照: [Defining States](#defining-states)) |
| `on` | `object` | | 現在の状態で受理できないイベントの遷移を定義します。 (参照: [Defining States](#defining-states)) |
| `context` | `any` | | ステートマシンの拡張された状態を定義します。 (参照: [Extended State](#extended-state)) |
| `$schema` | `object` | | ステートマシンのスキーマを型で定義します。 (参照: [Schema](#schema)) |

### State Machine Configuration

| プロパティ | 型 | 説明 |
| :-- | :-- | :-- |
| `guards` | `object` | ステートマシンのガード関数を定義します。 (参照: [Using Guards](#using-guards)) |
| `effects` | `object` | ステートマシンのエフェクト関数を定義します。 (参照: [Using Effects](#using-effects)) |
| `verbose` | `boolean` `0` `1` `2` | デバッグ用のログを有効にします。 (参照: [Logging](#logging)) |
| `console` | `object` | ログを出力するためのカスタムコンソールを定義します。 (参照: [Logging](#logging)) |

### Defining States

ステートマシンは有限数の状態のうち、1 つの状態にのみなることができます。また、状態はイベントによってのみ変化します。

状態は `states` オブジェクトのキーとして定義され、イベントタイプは各状態オブジェクトの `on` オブジェクトのキーとして定義されます。

```ts
{
  states: {
    // 状態名: 状態オブジェクト
    inactive: {
      on: { // イベント定義
        TOGGLE: "active", // イベントタイプ: 遷移先の状態値
      },
    },
    active: {
      on: {
        TOGGLE: "inactive",
      },
    },
  },
}
```

イベント定義では、`target` プロパティを持つオブジェクトを使用して、状態遷移をより詳細に制御できます (ガードの追加など)。

```ts
{
  on: {
    TOGGLE: {
      target: "active",
      guard: "isReady",
    },
  },
}
```

### Using Guards

ガードは、実際に状態遷移を行う前に実行される関数です。ガードが `true` を返す場合、状態遷移が許可されます。ガードが `false` を返す場合、状態遷移は拒否されます。

```ts
import { useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  {
    initial: "inactive",
    states: {
      inactive: {
        on: {
          TOGGLE: {
            target: "active",
            guard: "isReady",
          },
        },
      },
      active: {
        on: { TOGGLE: "inactive" },
      },
    },
  },
  {
    guards: {
      isReady: () => true,
    },
  },
)
```

use-machine-ts は `and`、`or`、`not` の 3 つのヘルパー関数を提供します。これらの関数を使用して、複雑なガードを作成することができます。

```ts
import { useMachine, and, or, not } from "use-machine-ts"

const [state, send] = useMachine(
  {
    initial: "inactive",
    states: {
      inactive: {
        on: {
          TOGGLE: {
            target: "active",
            guard: and(or("isReady", "isStopped"), not("isDestroyed")),
          },
        },
      },
      active: {
        on: { TOGGLE: "inactive" },
      },
    },
  },
  {
    guards: {
      isReady: () => true,
      isStopped: () => true,
      isDestroyed: () => true,
    },
  },
)
```

`and` 関数は単純に配列で置き換えることができます。

```ts
and(or("isReady", "isStopped"), not("isDestroyed"))
// equals
[or("isReady", "isStopped"), not("isDestroyed")]
```

`guard` が最終的に `false` を返す場合、次のようなログが出力されます。

```console
Transition from 'inactive' to 'active' denied by guard.
((isReady || isStopped) && !isDestroyed)
                           ^^^^^^^^^^^^ 
Event { type: "TOGGLE" }
Context undefined
```

`^` はガードが状態遷移を拒否した原因を示します。上記の例の場合、`isDestroyed` が `true` を返したため、状態遷移が拒否されたことがわかります。

> [!IMPORTANT]  
> ガードを 1 つも持たない `and` は常に `true` を返します。同様に、ガードを 1 つも持たない `or` は常に `false` を返します。

### Using Effects

エフェクトは、ステートマシンが特定の状態になると実行される関数です。エフェクトから関数を返す場合、その状態を離れるときに、その関数が実行されます。これは React での `useEffect` フックと同じような動作です。

```ts
import { useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  {
    initial: "active",
    states: {
      active: {
        on: { TOGGLE: "inactive" },
        effect: "onActive",
      },
    },
  },
  {
    effects: {
      onActive: (entryParams) => {
        console.log("「アクティブ」状態に入りました！")

        return (exitParams) => {
          console.log("「アクティブ」状態から出ました！")
        }
      },
    },
  },
)
```

`effect` プロパティには文字列ではなく、配列を渡すこともできます。

```ts
{
  effect: [
    "onActive",
    "onTransition",
  ],
}
```

エフェクト関数は次の 4 つのプロパティを持つオブジェクト (`entryParams`) をパラメーターとして受け取ります。

| プロパティ | 型 | 説明 |
| :-- | :-- | :-- |
| `event` | `object` | 現在の状態への遷移を引き起こしたイベントです。イベントは常にオブジェクト形式を使用します (例: `{ type: "TOGGLE" }`)。 |
| `context` | `any` | ステートマシンの拡張された状態です。 |
| `send` | `function` | ステートマシンにイベントを送信するための関数です。 |
| `setContext` | `function` | ステートマシンの拡張された状態を更新するための関数です。`send` プロパティを持つオブジェクトを返すため、`context` の更新と状態遷移を 1　行で書くことができます。 |
| `isMounted` | `function` | コンポーネントがマウントされているかどうかを確認するための関数です。 |

エフェクト関数が返す関数は、次の 4 つのプロパティを持つオブジェクト (`exitParams`) をパラメーターとして受け取ります。

| プロパティ | 型 | 説明 |
| :-- | :-- | :-- |
| `event` | `object` | 現在の状態からの遷移を引き起こしたイベントです。イベントは常にオブジェクト形式を使用します (例: `{ type: "TOGGLE" }`)。 |
| `context` | `any` | ステートマシンの拡張された状態です。 |
| `send` | `function` | ステートマシンにイベントを送信するための関数です。 |
| `setContext` | `function` | ステートマシンの拡張された状態を更新するための関数です。`send` プロパティを持つオブジェクトを返すため、`context` の更新と状態遷移を 1　行で書くことができます。 |
| `isMounted` | `function` | コンポーネントがマウントされているかどうかを確認するための関数です。 |

次の例では、失敗状態になるたびに `retryCount` を更新して、上限に達した場合はエラー状態に遷移します。

```ts
import { useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  {
    initial: "loading",
    context: { retryCount: 0 },
    states: {
      loading: {
        on: {
          FAILURE: "failure",
          DONE: "done",
        },
      },
      failure: {
        on: {
          RETRY: "loading",
          ERROR: "error",
        },
        effect: "onFailure",
      },
      error: {
        on: {
          RETRY: "loading",
        },
        effect: [
          "onError",
          "resetRetryCount",
        ],
      },
      done: {},
    },
  },
  {
    effects: {
      onFailure: ({ context, send, setContext }) => {
        if (context.retryCount < 3) {
          setContext(ctx => ({ retryCount: ctx.retryCount + 1 })).send("RETRY")
        } else {
          send("ERROR")
        }

        return ({ event }) => {
          if (event.type === "RETRY") {
            console.log("リトライ中...")
          } else {
            console.log("リトライ回数が上限に達しました！")
          }
        }
      },
      onError: () => {
        console.log("エラー状態に入りました！")
      },
      resetRetryCount: ({ setContext }) => {
        setContext(() => ({ retryCount: 0 }))
      },
    },
  },
)
```

> [!WARNING]
> ステートマシンの定義と設定は不変です。途中で変更することはできません。`effects` や `guards` などで定義された関数は、最初に定義されたときの値を参照し続けます。そのため、例えば状態の変更を直接監視する際には注意が必要です。

次の例は、React の `useEffect` フックを使用して、ステートマシンの状態が変化したときにコンポーネントの状態を更新する方法です。これは正しく動作します。

```ts
function Component(props: { onActive: () => void }) {
  const { onActive } = props
  const [state, send] = useMachine(
    /* State Machine Definition */,
    {
      effects: {
        onActive: () => {
        },
      },
    },
  )

  useEffect(() => {
    if (state.value === "active") {
      onActive()
    }
  }, [state])
}
```

上記の例を冗長的に感じて、次のようなコードを書いてしまうかもしれません。しかし、これは重大なバグを引き起こす可能性があります。

```ts
function Component(props: { onToggle: (isActive: boolean) => void }) {
  const { onToggle } = props
  const [state, send] = useMachine(
    /* State Machine Definition */,
    {
      effects: {
        onActive: () => {
          // props.onToggle が変更されても、その変更は反映されません。
          // 常に最初に定義された値を参照するため、重大なバグを引き起こす可能性があります。
          onToggle(true)
        },
      },
    },
  )
}
```

次のように `useRef` を使用して常に最新の関数を参照することで、この問題を回避することもできます。

```ts
function Component(props: { onToggle: (isActive: boolean) => void }) {
  const onToggle = React.useRef(props.onToggle)
  onToggle.current = props.onToggle
  const [state, send] = useMachine(
    /* State Machine Definition */,
    {
      effects: {
        onActive: () => {
          onToggle.current(true)
        },
      },
    },
  )
}
```

しかし、まだヒューマンエラーの可能性が残っています。実用的には、事前に定義されたマシーンを使用して、React コンポーネントに依存した値を転送する方法を推奨します。

```ts
import { createMachine } from "use-machine-ts"

function machine(
  props: () => {
    initial: "inactive" | "active"
    onToggle: (isActive: boolean) => void
  }
) {
  return createMachine(
    {
      initial: props().initial,
      states: {
        inactive: {
          on: { TOGGLE: "active" },
          effect: "onInactive",
        },
        active: {
          on: { TOGGLE: "inactive" },
          effect: "onActive",
        },
      },
    },
    {
      effects: {
        onActive: ({ context }) => {
          const { onToggle } = props()
          onToggle(true)
        },
        onInactive: ({ context }) => {
          const { onToggle } = props()
          onToggle(false)
        },
      },
    },
  )
}

function ToggleButton(props: { onToggle: (isActive: boolean) => void }) {
  const [state, send] = useMachine(machine, {
    initial: "inactive",
    onToggle: props.onToggle,
  })
}
```

関数形式で事前に定義されたマシーンは、1 つの引数を受け取ることができます。この引数は必ず関数でなければなりません。この関数は `useRef` のラッパーであり、常に最新の値を返します。

### Extended State

有限数の状態に加えて、ステートマシンは (コンテキストと呼ばれる) 拡張状態を持つことができます。`context` プロパティを使用して最初の拡張状態を定義し、`setContext` 関数を使用して拡張状態を更新します。

```ts
const [state, send] = useMachine(
  {
    initial: "inactive",
    context: { toggleCount: 0 },
    states: {
      inactive: {
        on: { TOGGLE: "active", },
      },
      active: {
        on: { TOGGLE: "inactive" },
        effect: "onActive",
      },
    },
  },
  {
    effects: {
      onActive: ({ setContext }) => {
        setContext(ctx => ({ toggleCount: ctx.toggleCount + 1 }))
      },
    },
  },
)

console.log(state.context) // { toggleCount: 0 }

send("TOGGLE")

console.log(state.context) // { toggleCount: 1 }
```

### Schema

TypeScript はコンテキストとイベントの型を自動的に推論しますが、`$schema` プロパティを使用して、ステートマシンのスキーマを明示的に定義することもできます。このオブジェクトはランタイムで使用されることはありません。

`$schema` プロパティは、`context`、 `events`、`strict` の 3 つのプロパティを持ちます。

| プロパティ | 型 | 必須 | 説明 |
| :-- | :-- | :-- | :-- |
| `context` | `any` | | ステートマシンの拡張状態の型を定義します。 |
| `events` | `object` | | ステートマシンのイベントの型を定義します。 |
| `strict` | `boolean` | | スキーマの厳密モードを有効にします。`true` に設定すると、自動推論が無効化され、スキーマに定義されていないコンテキストとイベントが型エラーになります。 |

```ts
import { useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  {
    $schema: {} as {
      context: {
        toggleCount: number,
      },
      events: {
        TOGGLE: {
          timestamp: Date,
        },
      },
    },
    context: { toggleCount: 0 },
    initial: "inactive",
    states: {
      inactive: {
        on: { TOGGLE: "active", },
      },
      active: {
        on: { TOGGLE: "inactive" },
        effect: "onActive",
      },
    },
  },
  {
    effects: {
      onActive: ({ event, setContext }) => {
        console.log(event)
        setContext(ctx => ({ toggleCount: ctx.toggleCount + 1 }))
      },
    },
  },
)

send("TOGGLE") // Type Error !

send({ type: "TOGGLE", timestamp: new Date() }) // OK (^_^)b

// Logs: { type: "TOGGLE", timestamp: 2024-01-01T00:00:00.000Z }
```

### Logging

必要に応じて、ステートマシンのログを有効にすることができます。`verbose` プロパティを使用して、ログの詳細度を設定します。。

| 値 | 説明 |
| :-- | :-- |
| `0` or `false` | ログを無効にします。 |
| `1` | エラーのみをログに出力します。 (デフォルト) |
| `2` or `true` | エラーとデバッグ情報をログに出力します。 |

```ts
import { useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  {
    initial: "inactive",
    states: {
      inactive: {
        on: { TOGGLE: "active" },
      },
      active: {
        on: { TOGGLE: "inactive" },
      },
    },
  },
  {
    verbose: 2,
  },
)
```

> [!NOTE]
> ログは `process.env.NODE_ENV` が `"production"` の場合には無効になります。

## useSharedMachine

`useSharedMachine` を使うためには `createSharedMachine` で作成されたステートマシンを使用する必要があります。

```ts
import { useSharedMachine, createSharedMachine } from "use-machine-ts"

const sharedMachine = createSharedMachine(
  /* State Machine Definition */,
  /* State Machine Configuration (Optional) */,
)

const [state, send] = useSharedMachine(sharedMachine)
```

`useSharedMachine` は `useMachine` と同じように動作しますが、外部から状態遷移を管理することができます。本質的には `useSyncExternalState` と `useEffect` のラッパーです。あなたの知識を借りられるならば、`atom` と `useAtom` のような関係で例えることができます。

```ts
const machineAtom = atom(/* Initial State */)
const [state, setState] = useAtom(machineAtom)

const send = (event) => {
  const nextState = eventToNextState(event, state)
  setState(nextState)
}
```

共有されたステートマシンは、`instance`、`dispatch`、`send`、`setContext`、`getState`、`subscribe` の 6 つのプロパティを持つオブジェクトです。

| プロパティ | 型 | 説明 |
| :-- | :-- | :-- |
| `instance` | `[Definition, Configuration?]` | ステートマシンのインスタンスです。 |
| `dispatch` | `function` | ステートマシンにイベントを送信するための関数です。`send` と `setContext` が利用する原始的な関数です。 |
| `send` | `function` | ステートマシンにイベントを送信するための関数です。 |
| `setContext` | `function` | ステートマシンの拡張された状態を更新するための関数です。 |
| `getState` | `function` | ステートマシンの現在の状態を取得するための関数です。 |
| `subscribe` | `function` | ステートマシンの状態変化を監視するための関数です。 |

## useSyncedMachine

`useMachine` と似ていますが、状態が遷移するたびに再レンダリングがトリガーされることはありません。このフックは現在の状態ではなく、状態のスナップショットを返す関数提供します。

```ts
import { useSyncedMachine } from "use-machine-ts"

const [getState, send] = useSyncedMachine({
  initial: "inactive",
  states: {
    inactive: {
      on: { TOGGLE: "active" },
    },
    active: {
      on: { TOGGLE: "inactive" },
    },
  },
})

console.log(getState())
// { value: "inactive", context: undefined,
//   event: { type: "$init" }, nextEvents: ["TOGGLE"] }

send("TOGGLE")

console.log(getState())
// { value: "active", context: undefined,
//   event: { type: "TOGGLE" }, nextEvents: ["TOGGLE"] }
```

# Async Orchestration

> [!WARNING]
> use-machine-ts において、非同期的にステートマシンの状態を更新することは避けるべきです。

非同期的にステートマシンの状態を更新するにあたって、いくつかの注意事項があります。use-machine-ts が提供する 3 つのフック (`useMachine`、`useSharedMachine`、`useSyncedMachine`) のそれぞれで注意点が異なります。

## useMachine

`useMachine` の中では、コンポーネントがマウントされている限り、非同期的に `send` と `setContext` 関数を呼び出すことはできます。ただし、コンポーネントがすでにアンマウントされている場合、これらの関数は状態を変更する代わりに、次のようなエラーメッセージを表示します。

```console
Cannot dispatch an action to the state machine after the component is unmounted.
Action { type: "SEND", payload: { type: "TOGGLE" } }
```

`setContext` の場合は `type` プロパティの値が `"SET_CONTEXT"` になります。

事前にコンポーネントがアンマウントされているかどうかを確認するために、`effect` 関数に渡されるパラメーターの `isMounted` プロパティを使用することができます。`isMounted` 関数はコンポーネントがマウントされていれば `true` を返し、それ以外の場合は `false` を返します。

```ts
import { useMachine } from "use-machine-ts"

const [state, send] = useMachine(
  {
    initial: "inactive",
    states: {
      inactive: {
        on: { TOGGLE: "active" },
      },
      active: {
        on: { TOGGLE: "inactive" },
      },
    },
  },
  {
    effects: {
      onActive: ({ send, isMounted }) => {
        setTimeout(() => {
          if (isMounted()) {
            send("TOGGLE")
          }
        }, 1000)
      },
    },
  },
)
```

## useSharedMachine

`useSharedMachine` の中では、コンポーネントのマウント状態に関係なく、非同期的に `send`、`setContext` または共有されたマシーンの `dispatch` を呼び出すことができます。エラーメッセージも警告メッセージも表示されないことに注意してください。事前にコンポーネントがアンマウントされているかどうかを確認するためには、`useMachine` と同様に `isMounted` 関数を使用することができます。

## useSyncedMachine

`useSyncedMachine` の中では、コンポーネントのマウント状態に関係なく、非同期的に `send` と `setContext` 関数を呼び出すことはできません。それらの関数はエフェクトの開始直前にアンロックされ、終了後にロックされます。ロックされた状態でこれらの関数を呼び出すと、次のようなエラーメッセージが表示されます。

```console
Send function not available. Must be used synchronously within an effect.
State { value: "inactive", event: { type: "$init" }, nextEvents: ["TOGGLE"], context: undefined }
Event: { type: "TOGGLE" }
```

ただし、`useSyncedMachine` が返す `send` 関数は、コンポーネントがアンマウントされていることをエラーメッセージで警告します。
