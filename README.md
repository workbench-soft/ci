# ci

Shared GitHub Actions steps for the workbench-soft repos. A fix here reaches each repo on its next run.

## What is here

| Path                                          | What it does                                                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `actions/setup`                               | Installs the tools from `mise.toml` and runs `pnpm install --frozen-lockfile`                               |
| `.github/workflows/dependabot-auto-merge.yml` | Merges a Dependabot PR as soon as it opens, then runs the checks on main. A major update waits for a person |
| `.github/workflows/merge-dependabot.yml`      | Calls that workflow for this repo's own Dependabot PRs, then runs Lint on main                              |

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

## CI runs on main only

Every workbench-soft repo runs its workflows on pushes to the default branch. PR runs are off: an agent runs the repo's tests and linter locally, merges, then may watch the run on main. A failure there gets its fix in a new PR.

To turn PR runs back on in a repo:

1. Find the off triggers: `git grep -n "# pull_request:" .github/workflows`.
2. In each hit, delete the two `# PR runs are off` comment lines and uncomment the `pull_request:` line and the lines indented under it.
3. For Dependabot, switch `dependabot-auto-merge.yml` back to `workflow_run` on the check workflows if merges should wait for checks. The git history of this README holds that version.
4. Change the "merge first" line for that repo in `writing-style.instructions.md` of `workbench-soft/agent-skills`, so agents wait for CI again.

## Test a change

`mise run lint` runs actionlint on the workflows, and `mise run test` checks the release scripts against a throwaway git repo. CI runs the lint on each push to main that changes more than Markdown.

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
