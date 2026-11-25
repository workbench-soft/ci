# ci

Shared GitHub Actions steps for the workbench-soft repos. A fix here reaches each repo on its next run.

## What is here

| Path                                          | What it does                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `actions/setup`                               | Installs the tools from `mise.toml` and runs `pnpm install --frozen-lockfile`, copying packages on Windows   |
| `.github/workflows/dependabot-auto-merge.yml` | Tests a Dependabot PR on its branch, lets Claude fix it, merges it once green. A major update waits          |
| `.github/workflows/merge-dependabot.yml`      | Calls that workflow for this repo's own Dependabot PRs, with Lint as the check                               |
| `scripts/ios-check.ts`                        | Lists each Android only piece of an app with no iOS plan, and fails on one missing from `ios-check.json`     |
| `actions/affected`                            | Says whether a product changed since its last green run or release, so CI skips the jobs of an unchanged one |
| `actions/ios-check`                           | Runs `ios-check.ts` in a job of the app repo                                                                 |
| `.github/workflows/ios-simulator.yml`         | Builds an Expo or Capacitor app for the iPhone simulator, runs its Maestro flows, uploads the screenshots    |

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
  workflow_run: # the checks on the branch decide the merge
    workflows: [Checks] # the name: of each file in workflows
    types: [completed]
    branches: ["dependabot/**"]
permissions:
  contents: write
  pull-requests: write
  actions: write
jobs:
  merge:
    uses: workbench-soft/ci/.github/workflows/dependabot-auto-merge.yml@main
    with:
      workflows: checks.yml # run on the branch, then on main after the merge
      allow_major: false # optional
      fix: true # optional, Claude fixes red checks on the PC runner
    secrets:
      dispatch_token: ${{ secrets.CI_DISPATCH_TOKEN }}
      claude_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }} # optional, from claude setup-token
```

- **List the checks** a token merge starts no push run. The shared workflow also dispatches each push release workflow whose publication guard names one of those checks.
- **Claude** the notes and the fix run on the PC runner, under the Claude subscription. `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token` lasts a year, and without it the PC login ends after a few weeks. A public repo skips both jobs. `scripts/person-steps/dependabot-ai-secrets.ps1` makes the token and sets both secrets in each calling repo.
- **Dispatch token** the Dependabot and Actions secret `CI_DISPATCH_TOKEN` of each calling repo starts the listed workflows, so a Release or Deploy web on `workflow_run` follows them. Without it the workflow token starts them, and GitHub fires no `workflow_run` for such a run.
- **`workflow_dispatch`** each file in `workflows` needs this trigger. Without it the run fails before the merge and names the file, and the PR stays open.

## Run only what changed

`actions/affected` says whether a product of the repo changed since a base. A job of an unchanged product then skips. The plan sits in `specs/affected-ci.md` of the `workspace` repo.

```yaml
- uses: workbench-soft/ci/actions/affected@main
  id: affected
  with:
    since: checks # or release
    product: desktop # optional, a product of .github/affected.json
```

- **Base** `checks` compares with the newest green run of the same workflow on `main` under `HEAD`. `release` compares with the last tag that matches `tag`, default the product's `tag` or `v*`.
- **Outputs** `run` is `true` when the product changed. `filter` holds the pnpm arguments for the changed packages and their dependents, such as `pnpm ${{ steps.affected.outputs.filter }} test`. `all` is `true` when everything counts as changed, and `filter` is then `-r`.
- **Everything** a run by hand, no base, a change to `pnpm-lock.yaml`, `pnpm-workspace.yaml`, the root `package.json`, `mise.toml`, `.github/actions/**`, `.github/affected.json` or the running workflow, and a file no package or product owns.
- **Skipped** a file under `ignore`, by default `**/*.md` and `docs/**`.
- **Job** the checkout needs `fetch-depth: 0`, and the job needs `actions: read` for `since: checks`.
- **workflow_run** such a run keeps the newest commit of `main` as its own commit. A workflow on `workflow_run` with `since: checks` MUST name the commit it checks out in `run-name`, such as `run-name: Deploy web ${{ github.event.workflow_run.head_sha || github.sha }}`, and the step reads it from there.

A repo with several products lists them in `.github/affected.json`. `packages` are pnpm names, `paths` are globs for files outside pnpm, and `global` and `ignore` replace the defaults:

```json
{
  "products": {
    "desktop": { "packages": ["media-organizer"], "paths": ["crates/**"], "tag": "desktop-v*" }
  }
}
```

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

The app repo's `.github/workflows/ios.yml` calls the build. It runs by hand, on the `ios-vm` runner:

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
- **npm apps** an app with `package-lock.json` skips `pnpm install` and runs `cap` through `npm exec`. It passes `install_args: node` and installs in `web_build`, such as `npm ci && npm run build`.
- **Build** `expo prebuild --platform ios`, or the web build with `cap sync ios`, then `pod install` and `xcodebuild` in Release for `iphonesimulator` with signing off.
- **Run** an iPhone simulator of the newest iOS boots, the app launches for `launch.png`, and Maestro `cli-2.12.1` runs each flow under `e2e/maestro/`.
- **Runner** the job runs on `[self-hosted, ios-vm]`, a Tart VM with Xcode on the owner's work Mac, at no GitHub minutes. A repo variable `CI_IOS_RUNNER` set to `["macos-latest"]` moves it to GitHub, where a minute counts as 10.
- **Upload** with `upload: true` and the five secrets `ASC_API_KEY_P8`, `ASC_API_KEY_ID`, `ASC_API_ISSUER_ID`, `APPLE_DIST_CERT_P12_BASE64` and `APPLE_DIST_CERT_PASSWORD`, the job archives a signed App Store build once the flows pass and uploads it with `altool`. `actions/ios-upload` finds or makes the profile `<bundle id> App Store CI` on the team's distribution certificate, sets manual signing on the app target alone, and takes the date and time as the build number. `marketing_version` sets the version string. It needs `workspace` set to the `.xcodeproj`.
- **Artifact** `ios-simulator` holds the screenshots, the Maestro report and debug output, crash reports and the last 300 lines of the xcodebuild log. `gh run download <run> -n ios-simulator` fetches it.
- **Another workflow** `uses: workbench-soft/ci/actions/ios-check@main` with `app_dir` runs the check alone, after `actions/setup` puts Node 24 on PATH.

## CI runs on main only

Every workbench-soft repo runs its workflows on pushes to the default branch. PR runs are off: an agent runs the repo's tests and linter locally, merges, then may watch the run on main. A failure there gets its fix in a new PR.

To turn PR runs back on in a repo:

1. Find the off triggers: `git grep -n "# pull_request:" .github/workflows`.
2. In each hit, delete the two `# PR runs are off` comment lines and uncomment the `pull_request:` line and the lines indented under it.
3. Change the "merge first" line for that repo in `writing-style.instructions.md` of `workbench-soft/agent-skills`, so agents wait for CI again.

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

This repo is public, so public repos of the org load its actions too. GitHub shares actions of a private repo with private repos only. Its own jobs run on GitHub runners, since the PC runner group serves private repos only, and its repo variable `CI_RUNNER` is `["ubuntu-latest"]` for the Dependabot merge it calls.
