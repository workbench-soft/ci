# Features

Shared GitHub Actions steps for the workbench-soft repos. A fix here reaches each repo on its next run.

## Setup step

- **What it gives** `actions/setup` installs the tools from `mise.toml` and runs `pnpm install --frozen-lockfile`.
- **Where** a repo adds `uses: workbench-soft/ci/actions/setup@main` after checkout.

## Dependabot auto merge

- **What it gives** a Dependabot PR merges as soon as it opens, and the checks run on main.
- **Limits** a major update waits for a person, unless the repo sets `allow_major`. A PR a person pushed to waits for a review.
- **Checks** only the workflows the repo lists in `workflows` run after the merge.
