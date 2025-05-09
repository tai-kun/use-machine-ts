# Changelog

## [1.0.0](https://github.com/tai-kun/use-machine-ts/compare/v0.4.0...v1.0.0) (2025-05-09)


### ⚠ BREAKING CHANGES

* enable erasableSyntaxOnly=true ([#168](https://github.com/tai-kun/use-machine-ts/issues/168))

We no longer use TypeScript-specific namespaces. All types that used to end with .Signature now simply end with Signature, without the dot. However, since Config.Signature and Definition.Signature do not use namespaces, they can still be used as before.

Before:

```ts
import type { Config } from "use-machine-ts";

type _1 = Config.Signature;
type _2 = Config.TransitionEvent.Signature;
```

After:

```ts
import type { Config } from "use-machine-ts";

type _1 = Config.Signature;
type _2 = Config.TransitionEventSignature;
                            // ~~
                            // The dot here is unnecessary.
```

### Features

* enable erasableSyntaxOnly=true ([#168](https://github.com/tai-kun/use-machine-ts/issues/168)) ([8328468](https://github.com/tai-kun/use-machine-ts/commit/83284689db9908aa2242d71ed2bbdc640d49a1b9))


### Miscellaneous Chores

* **deps-dev:** bump @size-limit/preset-small-lib from 11.1.6 to 11.2.0 ([#142](https://github.com/tai-kun/use-machine-ts/issues/142)) ([c0916bc](https://github.com/tai-kun/use-machine-ts/commit/c0916bc324ff58e972426b1e883969b3bc449540))
* **deps-dev:** bump @testing-library/react from 16.1.0 to 16.2.0 ([#137](https://github.com/tai-kun/use-machine-ts/issues/137)) ([6647eef](https://github.com/tai-kun/use-machine-ts/commit/6647eef18dee299f56a97966a329e769d08faabb))
* **deps-dev:** bump @types/node ([#124](https://github.com/tai-kun/use-machine-ts/issues/124)) ([5058555](https://github.com/tai-kun/use-machine-ts/commit/5058555d2981b30245e62d1cd452f6c94faba9ff))
* **deps-dev:** bump @types/node ([#148](https://github.com/tai-kun/use-machine-ts/issues/148)) ([b0d2c94](https://github.com/tai-kun/use-machine-ts/commit/b0d2c94183a9fecae606394e2d8033901e11e2fb))
* **deps-dev:** bump @types/node from 22.10.6 to 22.13.4 ([#139](https://github.com/tai-kun/use-machine-ts/issues/139)) ([c79ef04](https://github.com/tai-kun/use-machine-ts/commit/c79ef040061364313210b9d372fcfbd73d9b3a22))
* **deps-dev:** bump dprint from 0.48.0 to 0.49.0 ([#136](https://github.com/tai-kun/use-machine-ts/issues/136)) ([e8f0ee9](https://github.com/tai-kun/use-machine-ts/commit/e8f0ee9987dd2e97675f537016498bb68404708b))
* **deps-dev:** bump esbuild from 0.24.2 to 0.25.0 ([#135](https://github.com/tai-kun/use-machine-ts/issues/135)) ([3227290](https://github.com/tai-kun/use-machine-ts/commit/3227290243bdfb54a5cef85816b6cb037a2e0c4d))
* **deps-dev:** bump the dev-dependencies group across 1 directory with 2 updates ([#134](https://github.com/tai-kun/use-machine-ts/issues/134)) ([d93105a](https://github.com/tai-kun/use-machine-ts/commit/d93105a0b88b43b8d59438916257c3d8be9c7e3e))
* **deps-dev:** bump the dev-dependencies group across 1 directory with 2 updates ([#141](https://github.com/tai-kun/use-machine-ts/issues/141)) ([49e0478](https://github.com/tai-kun/use-machine-ts/commit/49e04789113c2640146deaed14149ff3d90a5533))
* **deps-dev:** bump the dev-dependencies group across 1 directory with 2 updates ([#145](https://github.com/tai-kun/use-machine-ts/issues/145)) ([61cac77](https://github.com/tai-kun/use-machine-ts/commit/61cac7714122933b9ea72ccbc51d4f412598bd43))
* **deps-dev:** bump the dev-dependencies group across 1 directory with 2 updates ([#150](https://github.com/tai-kun/use-machine-ts/issues/150)) ([8a90572](https://github.com/tai-kun/use-machine-ts/commit/8a9057200b1c6f3f4f54792ab1b84784ba18e47d))
* **deps-dev:** bump the dev-dependencies group across 1 directory with 3 updates ([#164](https://github.com/tai-kun/use-machine-ts/issues/164)) ([df45120](https://github.com/tai-kun/use-machine-ts/commit/df45120ea3a79a25a6c48e4d86a33bef43172524))
* **deps-dev:** bump the dev-dependencies group across 1 directory with 5 updates ([#129](https://github.com/tai-kun/use-machine-ts/issues/129)) ([ead8cdb](https://github.com/tai-kun/use-machine-ts/commit/ead8cdbb9007b1dff0f866ac8b3fc936ec5eb076))
* **deps-dev:** bump the dev-dependencies group across 1 directory with 5 updates ([#156](https://github.com/tai-kun/use-machine-ts/issues/156)) ([a2177a2](https://github.com/tai-kun/use-machine-ts/commit/a2177a283b9b068a42961229b2d130d3a04c3398))
* **deps-dev:** bump the dev-dependencies group with 2 updates ([#157](https://github.com/tai-kun/use-machine-ts/issues/157)) ([2b32edf](https://github.com/tai-kun/use-machine-ts/commit/2b32edf466a6ff88786cbb4f4392b52871d760de))
* **deps-dev:** bump typedoc from 0.27.9 to 0.28.0 ([#151](https://github.com/tai-kun/use-machine-ts/issues/151)) ([56fd9db](https://github.com/tai-kun/use-machine-ts/commit/56fd9db902cf7bac410dd66711e85a14ef461616))
* **deps-dev:** bump typedoc in the dev-dependencies group ([#122](https://github.com/tai-kun/use-machine-ts/issues/122)) ([897ce5f](https://github.com/tai-kun/use-machine-ts/commit/897ce5fcd327f44bd8a8f629a1e34dea71d474ea))
* **deps-dev:** bump typescript from 5.7.3 to 5.8.2 ([#147](https://github.com/tai-kun/use-machine-ts/issues/147)) ([d72a1ea](https://github.com/tai-kun/use-machine-ts/commit/d72a1ea63ba45db81992a700502d423e73db0846))
* fix dependbot ([49f5b4d](https://github.com/tai-kun/use-machine-ts/commit/49f5b4d01446e26ce0680fa8ead4a0324c220819))
* update deps ([f97ff3e](https://github.com/tai-kun/use-machine-ts/commit/f97ff3eb8f5c0b6deb414db7d1bf09a001c21848))
* update dprint plugins ([95fb1c8](https://github.com/tai-kun/use-machine-ts/commit/95fb1c81873bbc09b1ee5fd323d57421e1ac9b04))


### Continuous Integration

* add build job ([4f13d8f](https://github.com/tai-kun/use-machine-ts/commit/4f13d8fa7847aedea284301e00166528a956cc0d))
* fix ([bb4f60c](https://github.com/tai-kun/use-machine-ts/commit/bb4f60c3239e96546763183ad8cfe7042329691e))

## [0.4.0](https://github.com/tai-kun/use-machine-ts/compare/v0.3.0...v0.4.0) (2024-12-23)


### Features

* Supports React19 ([#120](https://github.com/tai-kun/use-machine-ts/issues/120)) ([e9c5d02](https://github.com/tai-kun/use-machine-ts/commit/e9c5d0286b11618288af2a48dfb9c0e479af87bc))


### Documentation

* fix README.ja ([d81635f](https://github.com/tai-kun/use-machine-ts/commit/d81635fcd1e02e8550be13e7a4eb4a619c611cb3))
* update README ([e3ff784](https://github.com/tai-kun/use-machine-ts/commit/e3ff7844e04ca446b6494eb6a74c440a42c3b231))


### Miscellaneous Chores

* **deps-dev:** bump @testing-library/react from 16.0.1 to 16.1.0 ([#119](https://github.com/tai-kun/use-machine-ts/issues/119)) ([ce86d65](https://github.com/tai-kun/use-machine-ts/commit/ce86d6557b6062e9904ce2953386cc41ca47c984))
* **deps-dev:** bump @types/node from 22.4.0 to 22.7.6 ([#97](https://github.com/tai-kun/use-machine-ts/issues/97)) ([34aa806](https://github.com/tai-kun/use-machine-ts/commit/34aa806a0bd2a60cd2b143cfbbebc1f78b8e8688))
* **deps-dev:** bump @types/node from 22.7.6 to 22.10.2 ([#115](https://github.com/tai-kun/use-machine-ts/issues/115)) ([79e6728](https://github.com/tai-kun/use-machine-ts/commit/79e672828b87c0c749c6531097a9485138caa748))
* **deps-dev:** bump dprint from 0.47.5 to 0.48.0 ([#118](https://github.com/tai-kun/use-machine-ts/issues/118)) ([889aa1f](https://github.com/tai-kun/use-machine-ts/commit/889aa1fe2a714346b330ff59d454a7a3f5adcfb3))
* **deps-dev:** bump esbuild from 0.23.1 to 0.24.0 ([#89](https://github.com/tai-kun/use-machine-ts/issues/89)) ([2d4a977](https://github.com/tai-kun/use-machine-ts/commit/2d4a977e2fffd70f52d45217fd1d2c339a2093d9))
* **deps-dev:** bump jsdom in the dev-dependencies group ([#88](https://github.com/tai-kun/use-machine-ts/issues/88)) ([1b71b2a](https://github.com/tai-kun/use-machine-ts/commit/1b71b2a50d5b767b1fa3b1004999eeea8498ddf6))
* **deps-dev:** bump the dev-dependencies group across 1 directory with 7 updates ([#102](https://github.com/tai-kun/use-machine-ts/issues/102)) ([fd4d27e](https://github.com/tai-kun/use-machine-ts/commit/fd4d27eb59033cb9cf276844b70adf6bc20a64cb))
* **deps-dev:** bump the dev-dependencies group across 1 directory with 8 updates ([#87](https://github.com/tai-kun/use-machine-ts/issues/87)) ([fc84297](https://github.com/tai-kun/use-machine-ts/commit/fc8429726c6048bf564a76dd36833c157c3e858f))
* **deps-dev:** bump tsx from 4.17.0 to 4.19.1 ([#91](https://github.com/tai-kun/use-machine-ts/issues/91)) ([460b113](https://github.com/tai-kun/use-machine-ts/commit/460b113654ce23975061d7464041c38b9e61ea90))
* **deps-dev:** bump typedoc from 0.26.11 to 0.27.5 ([#116](https://github.com/tai-kun/use-machine-ts/issues/116)) ([a88ec78](https://github.com/tai-kun/use-machine-ts/commit/a88ec7858a2fbef678a106ddfcc73a78c5cdf458))
* **deps-dev:** bump typescript from 5.5.4 to 5.6.2 ([#90](https://github.com/tai-kun/use-machine-ts/issues/90)) ([91ffb70](https://github.com/tai-kun/use-machine-ts/commit/91ffb7034ba311e5fc40b98b1fee834bad823e44))
* **deps-dev:** bump typescript from 5.6.3 to 5.7.2 ([#105](https://github.com/tai-kun/use-machine-ts/issues/105)) ([22ea95b](https://github.com/tai-kun/use-machine-ts/commit/22ea95be49d4a61328073dd5ede17f014b86b565))

## [0.3.0](https://github.com/tai-kun/use-machine-ts/compare/v0.2.3...v0.3.0) (2024-09-13)


### Features

* export all guard utils as `guards` ([bb51db8](https://github.com/tai-kun/use-machine-ts/commit/bb51db80378536a28aebd9146f4ccb39cc86d786))


### Reverts

* bf88c87 ([aaf30b8](https://github.com/tai-kun/use-machine-ts/commit/aaf30b8357d130da30a6fedec2ba33b4aa1e9084))


### Documentation

* rebuild ([44d6e00](https://github.com/tai-kun/use-machine-ts/commit/44d6e00af64440604a69bb5f9f75a86486eef3d1))


### Miscellaneous Chores

* **deps-dev:** bump the dev-dependencies group across 1 directory with 4 updates ([bf88c87](https://github.com/tai-kun/use-machine-ts/commit/bf88c87bbb7e901ad1c4c164ec929e5e4f77173d))
* Improve texts ([2d34784](https://github.com/tai-kun/use-machine-ts/commit/2d34784d0116b1d6e01f7121d2157729dffd280f))
* **scripts:** Improve format checking of commit messages ([09e6f0e](https://github.com/tai-kun/use-machine-ts/commit/09e6f0e8a178b9e4b2876a15c191ccbfecb2683e))


### Code Refactoring

* change coding style ([b6f6703](https://github.com/tai-kun/use-machine-ts/commit/b6f6703544946b6ad6935e963adb0e8cff04a3f6))


### Continuous Integration

* replace existing release workflow with release-please ([72f56f5](https://github.com/tai-kun/use-machine-ts/commit/72f56f5c6a4776852fd56e3ed1abd60b928dc9b2))

## <small>v0.2.3 (2024-08-18)</small>

Drop peerDependencies.

## <small>v0.2.2 (2024-05-31)</small>

Improved documentation.

## <small>v0.2.1 (2024-05-13)</small>

Improved log messages.

## <small>v0.2.0 (2024-03-30)</small>

### Features

- `useSyncExternalStore` now accepts `getServerState` as an option. This is passed to `getServerSnapshot`, the third argument of `React.useSyncExternalStore`. ([5021f01](https://github.com/tai-kun/use-machine-ts/commit/5021f01311698a7b9cec78dbb5b62815979963cf))

### Breaking changes

- `transfer`, `isTransfer`, and `Transfer` are no longer needed. The new syntax allows only one optional argument to the function that creates the state machine, but eliminates the need to mark individually transferable values. ([75ca0f8](https://github.com/tai-kun/use-machine-ts/commit/75ca0f804ff84f40f77084817f3ce0b7641a38d9))

Previous transfer syntax:

```ts
import { createMachine, type Transfer, transfer } from "use-machine-ts"

function machine(props: Transfer<object>) {
  return createMachine({ /* ... */ }, {
    effects: {
      onChange: () => {
        const { onChange } = props.current
        onChange?.()
      },
    },
  })
}

function ReactComponent(props: object) {
  const [state, send] = useMachine(machine, [transfer(props)])
  // ...
}
```

New transfer syntax:

```ts
import { createMachine } from "use-machine-ts"

function machine(props: () => object) {
  return createMachine({ /* ... */ }, {
    effects: {
      onChange: () => {
        const { onChange } = props()
        onChange?.()
      },
    },
  })
}

function ReactComponent(props: object) {
  const [state, send] = useMachine(machine, props)
  // ...
}
```

## <small>v0.1.4 (2024-03-19)</small>

Please refer to [README.md](https://github.com/tai-kun/use-machine-ts/blob/v0.1.4/README.md) for details.

## <small>v0.1.0 (2024-03-15)</small>

First release.
