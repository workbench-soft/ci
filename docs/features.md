# Features

Shared GitHub Actions steps for the workbench-soft repos. A fix here reaches each repo on its next run.

## Setup step

- **What it gives** `actions/setup` installs the tools from `mise.toml` and runs `pnpm install --frozen-lockfile`.
- **Where** a repo adds `uses: workbench-soft/ci/actions/setup@main` after checkout.
- **Limits** `install_args` picks the tools, and `pnpm-install: "false"` skips the install in a repo without a lockfile.

Spec: [shared-workflows](../specs/shared-workflows.md).

## Dependabot auto merge

- **What it gives** a Dependabot PR merges as soon as it opens, and the checks run on main.
- **Limits** a major update waits for a person, unless the repo sets `allow_major`. A PR a person pushed to waits for a review.
- **Checks** only the workflows the repo lists in `workflows`, space separated, run after the merge, with each push release workflow that waits on one of them. A listed file without `workflow_dispatch` stops the run before the merge.

Spec: [shared-workflows](../specs/shared-workflows.md).

## Releases

- **What it gives** a tagged release such as `v2026.10.30.1` after a push to `main` passes `Lint`. Its notes list the commits since the release before.
- **Where** the [Releases page](https://github.com/workbench-soft/ci/releases).
- **Limits** notes only, with no files to download. Two releases that pick the same version side by side: the later one fails, and the next push ships its commits.

Spec: [releases](../specs/releases.md).
