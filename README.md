# ci

Shared GitHub Actions steps for the workbench-soft repos. A fix here reaches each repo on its next run.

## What is here

| Path                                          | What it does                                                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `actions/setup`                               | Installs the tools from `mise.toml` and runs `pnpm install --frozen-lockfile`, copying packages on Windows  |
| `.github/workflows/dependabot-auto-merge.yml` | Merges a Dependabot PR as soon as it opens, then runs the checks on main. A major update waits for a person |
| `.github/workflows/merge-dependabot.yml`      | Calls that workflow for this repo's own Dependabot PRs, then runs Lint on main                              |
| `scripts/ios-check.ts`                        | Lists each Android only piece of an app with no iOS plan, and fails on one missing from `ios-check.json`    |
| `actions/ios-check`                           | Runs `ios-check.ts` in a job of the app repo                                                                |
| `.github/workflows/ios-simulator.yml`         | Builds an Expo or Capacitor app for the iPhone simulator, runs its Maestro flows, uploads the screenshots   |

## Use it in a repo

The setup step in a job, after `actions/checkout`:

```yaml
- uses: workbench-soft/ci/actions/setup@main
  with:
    install_args: node pnpm # optional, defaults to every tool in mise.toml
```

The action keeps mise shims under `runner.temp` for the whole job, the
caller's steps too. On Windows it installs the tools one job at a time,
since the PC runners share one mise folder.

The repo's `dependabot-auto-merge.yml`:

```yaml
on:
  pull_request_target:
    types: [opened, reopened, synchronize]
permissions:
  contents: write
  pull-requests: write
  actions: write
jobs:
  merge:
    uses: workbench-soft/ci/.github/workflows/dependabot-auto-merge.yml@main
    with:
      workflows: checks.yml # run on main after the merge
      allow_major: false # optional
```

- **List the checks** a token merge starts no push run. The shared workflow also dispatches each push release workflow whose publication guard names one of those checks.
- **`workflow_dispatch`** each file in `workflows` needs this trigger. Without it the run fails before the merge and names the file, and the PR stays open.

## iOS check and simulator build

The plan for the iPhone apps sits in `specs/ios-apps.md` of the `workspace` repo, and the details of these pieces in [specs/ios-apps.md](specs/ios-apps.md).

The app repo's `mise.toml` runs the check on the PC, from the `ci` clone in the workspace:

```toml
[tasks.ios-check]
description = "List the Android only pieces with no iOS plan"
run = "node {{env.WBS_ROOT}}/ci/scripts/ios-check.ts ."
```

Each item prints as `missing` or `allowed`. An item the app hides on iOS on purpose goes in `ios-check.json` beside `package.json`, with its reason:

```json
{ "allow": { "package:expo-intent-launcher": "every call sits behind Platform.OS === 'android'" } }
```

The app repo's `.github/workflows/ios.yml` calls the build. A macOS minute counts as 10, so it runs by hand:

```yaml
name: iOS simulator
on:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  ios:
    uses: workbench-soft/ci/.github/workflows/ios-simulator.yml@main
    with:
      kind: expo # or capacitor
      app_dir: . # optional, such as apps/mobile
      # scheme, workspace, web_build, install_args, xcode and device are optional too
    secrets:
      build_env: |
        EXPO_PUBLIC_FIREBASE_API_KEY=${{ secrets.FIREBASE_API_KEY }}
```

- **Check first** the `ios-check` job runs on the org's `CI_RUNNER` and stops the run before the macOS job when an item is missing.
- **Build** `expo prebuild --platform ios`, or the web build with `cap sync ios`, then `pod install` and `xcodebuild` in Release for `iphonesimulator` with signing off.
- **Run** an iPhone simulator of the newest iOS boots, the app launches for `launch.png`, and Maestro `cli-2.12.1` runs each flow under `e2e/maestro/`.
- **Artifact** `ios-simulator` holds the screenshots, the Maestro report and debug output, crash reports and the last 300 lines of the xcodebuild log. `gh run download <run> -n ios-simulator` fetches it.
- **Another workflow** `uses: workbench-soft/ci/actions/ios-check@main` with `app_dir` runs the check alone, after `actions/setup` puts Node 24 on PATH.

## CI runs on main only

Every workbench-soft repo runs its workflows on pushes to the default branch. PR runs are off: an agent runs the repo's tests and linter locally, merges, then may watch the run on main. A failure there gets its fix in a new PR.

To turn PR runs back on in a repo:

1. Find the off triggers: `git grep -n "# pull_request:" .github/workflows`.
2. In each hit, delete the two `# PR runs are off` comment lines and uncomment the `pull_request:` line and the lines indented under it.
3. For Dependabot, switch `dependabot-auto-merge.yml` back to `workflow_run` on the check workflows if merges should wait for checks. The git history of this README holds that version.
4. Change the "merge first" line for that repo in `writing-style.instructions.md` of `workbench-soft/agent-skills`, so agents wait for CI again.

## Test a change

`mise run lint` runs actionlint on the workflows and oxlint and `tsc` on the scripts. `mise run test` checks the release scripts against a throwaway git repo, and `ios-check.ts` with Vitest. CI runs the lint on each push to main that changes more than Markdown.

Lint runs through `actions/setup`, so a broken setup action fails here first. A repo that calls `jdx/mise-action` directly should write `MISE_SHIMS_DIR=$RUNNER_TEMP/mise-shims` to `$GITHUB_ENV` before it, as the setup action does.

A change reaches every repo on merge. Before the merge, point one repo at the branch (`@my-branch`) and run its checks.

## Releases

A push to `main` that passes Lint gets a release, such as `v2026.10.30.1`.
Release starts on `workflow_run` once Lint passes, so no job holds a runner
while it waits. A run by hand publishes only when Lint of the commit passed.
Its notes list the commits since the release before. The repos keep calling
`@main`, so a release changes no repo by itself. To hold back changes from here,
a repo can pin a tag in place of `@main`.

## Access

This repo is private. Settings, Actions, General, Access is set to "Accessible from repositories in the organization". Without it, the other repos fail to load the workflows.
