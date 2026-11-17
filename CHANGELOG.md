# Changelog

## Unreleased

- **Affected after workflow_run** a deploy that starts when Checks end compares with the commit its last green run shipped, read from its `run-name`, in place of the newer `main` head GitHub records for such a run.
- **Product map** a change to `.github/affected.json` counts as a change to every product. It read as "belongs to no package or product" before, and a product with `.github/**` in its paths took it alone.
- **Affected step** `actions/affected` tells a workflow whether a product changed since its last green run or release, from the diff and the pnpm package graph, so an unchanged product skips its checks and its release. This repo cuts no release for a push that changes only Markdown and docs.
- **Release after Dependabot merges** the shared auto-merge takes a `dispatch_token` secret and starts the checks with it, so Release and Deploy web on `workflow_run` of Checks follow. Without it a warning names the gap.
- **iOS simulator for npm apps** an app with `package-lock.json` skips `pnpm install` and runs Capacitor through `npm exec`.
- **iOS check** `scripts/ios-check.ts` lists the Expo modules, packages, Gradle libraries, Capacitor platforms and Kotlin wrappers of an app with no iOS side, and fails on one missing from the app's `ios-check.json`. App repos run it through a mise task and `actions/ios-check`.
- **iOS simulator** the reusable `ios-simulator.yml` builds an Expo or Capacitor app for the iPhone simulator on macOS, launches it, runs its Maestro flows and uploads the `ios-simulator` artifact.
- **TypeScript** the repo pins Node and pnpm. Lint runs oxlint and `tsc`, and test runs Vitest.

- **Older runs stop on GitHub** a newer push to `main` cancels the Checks and the release build of the older commit through `concurrency`, with the local-ci page off too.

- **Dependabot releases** a failed lookup of the workflow list stops the run before the merge, so the PR stays open in place of merging without its paired release.
- **Lint token** the Lint workflow gets a read-only token.
- **Docs** the changelog names the runner store as `C:\ci\_pnpm-store`.

- **Lint before the push** a pre-push hook runs `mise run lint`, so a lint or format error stays on the PC instead of failing Lint on `main`.

- **Setup** on Windows `pnpm install` copies packages from a store of the runners, `C:\ci\_pnpm-store`, in place of hardlinks into the shared one, so a delete of another checkout no longer fails `expo export` with `EBUSY`. A hardlinked `node_modules` moves to `_trash-*` once.
- **Dependabot releases** a Dependabot merge also dispatches a release workflow that uses `release-gate.sh`, so repos on the new Release shape get a build beside their checks.
- **Docs** the README, the architecture diagram and the release spec describe the `workflow_run` start of Release.

- **CI** Release starts on `workflow_run` once Lint passes on `main`, one at a time. It no longer holds a PC runner while it waits, which starved Checks and timed releases out.

- **Release** `release.yml` and `wait-for-checks.sh` match the `repo-ci` templates, and shellcheck checks every release script.
- **Setup** the job's own mise shim folder reaches every step, the separate install step and the caller's steps too. Lint runs through the setup action and runs `mise run test`.
- **Dependabot releases** a token merge dispatches release builds paired with
  the selected checks, so both start without waiting for the checks to finish.

- **Parallel release builds** releases build beside checks after a push. Only publication waits for matching checks; open PRs hold no build.

- **Own Dependabot PRs** `merge-dependabot.yml` merges this repo's Dependabot PRs through the shared workflow, then runs Lint on main.
- **Docs** each heading of `docs/features.md` links its spec, and each feature that had no spec got one.
- **CI** portable jobs read their runner from the org variables `CI_RUNNER` and `CI_HEAVY_RUNNER`, so they build on Oracle or Blacksmith while the free minutes last, then on the PC. Jobs that need Windows or the PC keep their PC labels.

- **Dependabot auto-merge** a listed workflow without `workflow_dispatch` stops the run before the merge, so the PR stays open and the error names the file.
- **Releases** a newer release run waits in place of cancelling the running one, and a rerun reuses the tag a failed run pushed. A release started by hand runs on `main` only.
- **Release scripts** `next-version.sh` stops without a date, the notes skip a `Co-Authored-By` line in any case, and `mise run test` checks both scripts.

- **Markdown** markdownlint-cli2 lints the docs in `mise run lint`.

- **Architecture decisions** `docs/architecture.md` gets a Decisions section. Each big choice names its reason, its cost and the rivals it beat.

- **Lint and format** `mise run lint` checks the release scripts with shellcheck and shfmt, and every file with oxfmt, next to actionlint.

- **Releases** a release built on the PC carries the Sydney date again. Before 11:00 in Sydney it got the day before.
- **Releases** each push to `main` that passes Lint gets a GitHub release such as `v2026.10.30.1`. Its notes list the commits since the release before.
- **Dependabot auto-merge** a PR a person pushed to waits for a review. A second run for a merged PR stops, so the checks start once.
- **Lint** actionlint 1.7.12 with a pinned shellcheck, and docs-only pushes skip it.
- **Docs** `docs/features.md` and `docs/architecture.md` give a high level view with a diagram.

- **Dependabot auto-merge** merges a PR as soon as it opens and then runs the checks on main. Callers switch to `pull_request_target`, and `dependabot-metadata.yml` is gone.
- **CI** runs on pushes to main only. PR runs are off, and the workflow says how to turn them back on.
- Shared setup action and Dependabot workflows for the app repos.
