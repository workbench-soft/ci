# ci

Shared GitHub Actions steps for the workbench-soft repos. A fix here reaches each repo on its next run.

## What is here

| Path | What it does |
| --- | --- |
| `actions/setup` | Installs the tools from `mise.toml` and runs `pnpm install --frozen-lockfile` |
| `.github/workflows/dependabot-metadata.yml` | Stores the update type of a Dependabot PR for the merge job |
| `.github/workflows/dependabot-auto-merge.yml` | Merges a Dependabot PR once each check passes. A major update waits for a person |

## Use it in a repo

The setup step in a job, after `actions/checkout`:

```yaml
- uses: workbench-soft/ci/actions/setup@main
  with:
    install_args: node pnpm # optional, defaults to every tool in mise.toml
```

The metadata job in the repo's `checks.yml`:

```yaml
dependabot-metadata:
  uses: workbench-soft/ci/.github/workflows/dependabot-metadata.yml@main
```

The repo's `dependabot-auto-merge.yml`:

```yaml
on:
  workflow_run:
    workflows: [Checks]
    types: [completed]
permissions:
  contents: write
  pull-requests: write
  checks: read
  actions: read
jobs:
  merge:
    uses: workbench-soft/ci/.github/workflows/dependabot-auto-merge.yml@main
```

## Test a change

`mise run lint` runs actionlint on the workflows. CI runs the same check on each PR.

A change reaches every repo on merge. Before the merge, point one repo at the branch (`@my-branch`) and run its checks.

## Access

This repo is private. Settings, Actions, General, Access is set to "Accessible from repositories in the organization". Without it, the other repos fail to load the workflows.
