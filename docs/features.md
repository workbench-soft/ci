# Features

Shared GitHub Actions steps for the workbench-soft repos. A fix here reaches each repo on its next run.

## Setup step

- **What it gives** `actions/setup` installs the tools from `mise.toml` and runs `pnpm install --frozen-lockfile`. On Windows it copies packages in place of hardlinks, so another runner deleting its checkout can't fail a read with `EBUSY`.
- **Where** a repo adds `uses: workbench-soft/ci/actions/setup@main` after checkout.
- **Limits** `install_args` picks the tools, and `pnpm-install: "false"` skips the install in a repo without a lockfile.

Spec: [shared-workflows](../specs/shared-workflows.md).

## iOS check and simulator build

- **What it gives** a list of each Android only piece of an app with no iOS plan, and an iPhone simulator build with screenshots of its Maestro flows.
- **Where** the `ios-check` mise task of an app repo, `actions/ios-check`, and `ios-simulator.yml` called from the app's `ios.yml`.
- **Limits** the check reads fixed paths of the app folder. The simulator has no camera or real sensors, and each run costs macOS minutes, counted 10 times.

Spec: [ios-apps](../specs/ios-apps.md).

## Dependabot auto merge

- **What it gives** a Dependabot PR merges as soon as it opens, and the checks run on main.
- **Limits** a major update waits for a person, unless the repo sets `allow_major`. A PR a person pushed to waits for a review.
- **Checks** only the workflows the repo lists in `workflows`, space separated, run after the merge, with each push release workflow that waits on one of them. A listed file without `workflow_dispatch` stops the run before the merge.

Spec: [shared-workflows](../specs/shared-workflows.md).

## Play bundle once a day

- **What it gives** each Android app sends its newest release to Google Play at 19:00 Sydney time, and a push builds only the APK.
- **Where** the app's `play.yml` calls `actions/play-gate`, builds the bundle of the tag it names, uploads it, then calls `actions/play-mark`.
- **Limits** a release with no new tag since the last send builds nothing. A marker unused for 7 days goes, and Play then refuses the repeat upload once.

Spec: [play-daily](../specs/play-daily.md).

## Releases

- **What it gives** a tagged release such as `v2026.10.30.1` after a push to `main` passes `Lint`. Its notes list the commits since the release before.
- **Where** the [Releases page](https://github.com/workbench-soft/ci/releases).
- **Limits** notes only, with no files to download. Two releases that pick the same version side by side: the later one fails, and the next push ships its commits.

Spec: [releases](../specs/releases.md).
