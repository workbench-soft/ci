# iOS pieces for the app repos

## One-pager

- **Problem** the phone apps ship on Android only, and each app repo would
  copy the same iOS check and macOS build by hand.
- **Check** `scripts/ios-check.ts` lists each Android only piece of an app
  that has no iOS plan, and fails until the app lists it in `ios-check.json`
  with a reason.
- **Build** `.github/workflows/ios-simulator.yml` builds an Expo or Capacitor
  app for the iPhone simulator, runs its Maestro flows and uploads the
  screenshots and logs as the `ios-simulator` artifact.
- **Use** an app repo runs the check through a mise task on the PC and the
  `actions/ios-check` action in CI, and calls the workflow by hand.
- **Cost** a macOS minute counts as 10, so the workflow runs on dispatch or on
  release, and the check runs on a cheap runner before the macOS job starts.
- **Plan** the org plan sits in `specs/ios-apps.md` of the `workspace` repo.

## What it does for the person

- **The owner** sees which parts of an app still block an iPhone build, and
  gets screenshots of each app on an iPhone simulator without a Mac.

## User flows

### An agent ports an app

1. The agent runs `mise run ios-check` in the app repo. Each item prints with
   `missing` or `allowed`.
2. The agent ports each missing item, or lists it in `ios-check.json` with the
   reason the app hides it on iOS.
3. The agent starts the app's `ios.yml` by hand. The check job runs first,
   then the macOS job builds, installs and runs the flows.
4. The agent downloads the `ios-simulator` artifact with `gh run download`
   and reads each screenshot.

## How it works: modules, files, data

### The check

`node scripts/ios-check.ts <app dir>` reads fixed paths only, so it skips
`node_modules`. An item has an id and a detail line:

| Id               | Found when                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `module:<name>`  | `modules/<name>/expo-module.config.json` lacks `apple` and `ios` in `platforms` and as a key |
| `package:<name>` | `package.json` depends on a package from the Android only list                               |
| `gradle:<coord>` | a Gradle file pulls an Android only library, such as Shizuku                                 |
| `capacitor:ios`  | a Capacitor app has `android/` and no `ios/`                                                 |
| `wrapper:<path>` | a Gradle app that is neither Expo nor Capacitor, with no Xcode project beside it             |

- **Allow file** `ios-check.json` in the app folder maps an id to its reason:
  `{ "allow": { "package:expo-intent-launcher": "calls sit behind Platform.OS" } }`.
  An empty reason fails the run.
- **Exit code** 1 when an item is missing from the allow file, 0 otherwise.
  A listed id that no longer shows prints as stale, without a failure.

### The simulator workflow

- **Check job** runs `actions/ios-check` on the org's `CI_RUNNER`, so a
  missing plan fails before a macOS minute is spent.
- **Build** `actions/setup`, then `expo prebuild --platform ios` or the web
  build with `cap sync ios`, `pod install` when a `Podfile` exists, and
  `xcodebuild` in Release for `iphonesimulator` with signing off.
- **Run** boots the newest iPhone simulator, installs the `.app`, launches it
  for a first screenshot, then runs `e2e/maestro/` with Maestro `cli-2.12.1`,
  the version the PC pins.
- **Artifact** `ios-simulator` holds the screenshots, the Maestro output and
  the last 300 lines of the xcodebuild log.
- **Secrets** one optional secret `build_env` holds `KEY=value` lines for the
  build, such as Firebase keys. Each value gets masked.

## Limits

- **Simulator** no camera, compass or real sensors. Those need Test Lab.
- **Minutes** each run costs macOS minutes, so callers SHOULD start it by hand
  or on release.
- **Check scope** the check reads the app folder only. A workspace package of
  a monorepo counts when the app's `package.json` names it.

## Changes

### 2026-11-13 shared iOS check and simulator workflow

- **Why** the iOS plan needs one portability check and one macOS build that
  each app repo reuses. `servohop` ports first.
- **Changes** `scripts/ios-check.ts` with Vitest tests, `actions/ios-check`,
  `.github/workflows/ios-simulator.yml`, Node and pnpm in `mise.toml` with
  typecheck, oxlint and Vitest in lint and test.
- **Steps** this spec, then the check with its tests, then the workflow and
  the docs.
- **Docs** README, CHANGELOG, `docs/features.md`, `docs/architecture.md`.

### 2026-11-14 npm apps in the simulator workflow

- **Why** `consdr` keeps npm and `package-lock.json`, and the workflow ran `pnpm install` and `pnpm exec cap`, which fail with no `pnpm-lock.yaml`.
- **Changes** `ios-simulator.yml` skips `pnpm install` when `app_dir` holds `package-lock.json`, and runs `cap` through `npm exec` there. The caller installs in `web_build`, such as `npm ci && npm run build`, with `install_args: node`.
- **Steps** this entry with the workflow and the docs, in one PR.
- **Docs** README, CHANGELOG.

### 2026-11-26 ios-vm runner and App Store upload

- **Why** the 4 Capacitor apps ship to the App Store, and a GitHub macOS minute counts as 10. The owner's work Mac now hosts the Tart VM runner `wbs-ios`, labels `self-hosted, macOS, ARM64, ios-vm`, with Xcode 27.1 and iOS 27.0 and 27.1 simulator runtimes.
- **Changes** `ios-simulator.yml` runs on `CI_IOS_RUNNER` or `[self-hosted, ios-vm]`, lists the runtimes, erases the simulator before each boot and shuts it down after. `upload: true` runs `actions/ios-upload` after the flows pass: `scripts/ios-profile.ts` finds or makes the App Store profile through the API, `scripts/ios-sign-project.ts` sets manual signing on the app target, then archive, export and `altool` with the API key.
- **Signing** manual on the app target, since automatic signing needs a development profile and the team has no registered device. A command line setting would also reach the Swift packages.
- **Steps** this entry with the workflow, the action, the scripts and the docs, pushed to `main`.
- **Docs** README, CHANGELOG, `docs/architecture.md`, `docs/features.md`.

### 2026-11-26 purchase review screenshots from the flows

- **Why** an in-app purchase stays `MISSING_METADATA` until it has an App Review screenshot of the app selling it. A web build sells nothing, and the org artifact storage is full, so a Maestro screenshot can't leave CI as an artifact.
- **Changes** `ios-simulator.yml` takes `iap_review_shots`, such as `keeppad_remove_ads=record-02-cancelled.png keeppad_pro=settings-02-pro.png`. After the flows, `actions/iap-review-shots` runs `scripts/iap-review-shots.ts`, which uploads each screenshot to its purchase through the API. A purchase that has a shot keeps it.
- **Docs** README, CHANGELOG, `docs/features.md`.
