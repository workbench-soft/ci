# Shared CI for the workbench-soft repos

## 2026-10-29 First version

The app repos copied the same CI steps by hand, and the copies drifted. This repo holds the shared parts. Each app repo keeps its own repo and calls them.

- **Setup action** `actions/setup` installs the mise tools and the pnpm dependencies.
- **Dependabot metadata** `dependabot-metadata.yml` stores the update type of a Dependabot PR.
- **Dependabot auto-merge** `dependabot-auto-merge.yml` merges a Dependabot PR once its checks pass, and leaves a major update for a person.
- **Version** app repos call `@main`, so a merge here reaches each repo on its next run.
- **Access** this repo is private. Settings, Actions, Access is set to the organization, so the other private repos can call it.
- **Left per repo** the app checks and the release jobs. Their steps differ by stack.

## 2026-10-30 Merge Dependabot PRs on open

PR checks are off in the app repos, so the merge can't wait for them. The first version waited on `workflow_run` and read the update type from an artifact.

- **Trigger** a repo calls `dependabot-auto-merge.yml` from `pull_request_target`, which runs from main and gets a write token. The job checks out no PR code.
- **Metadata** the job runs `dependabot/fetch-metadata` itself. `dependabot-metadata.yml` is gone.
- **Major updates** wait for a person, unless the repo sets `allow_major: true`.
- **Checks after the merge** a merge made with the workflow token starts no push run. The job runs each file in the `workflows` input on main, and each one needs `workflow_dispatch`.
- **Who merges** the job merges only when Dependabot opened the PR and Dependabot made the event. A commit a person pushes to the branch waits for that person.
- **Run twice** a run that finds the PR already merged or closed stops, so the checks start once.

## 2026-11-01 A bad `workflows` list stops the merge

`gh workflow run` fails for a file without `workflow_dispatch`, and the step ran it after the merge. The merged commit then got no check and no release, and the loop stopped at the first file.

- **Check first** the job reads each listed file on the base branch with `gh workflow view --yaml` and looks for a `workflow_dispatch:` line. A miss fails the run before the merge with an error that names the file, so the PR stays open.

## 2026-11-03 This repo merges its own Dependabot PRs

The app repos called the workflow, and this repo didn't. Its Dependabot PRs, such as ci#7, stayed open.

- **Caller** `merge-dependabot.yml` calls `dependabot-auto-merge.yml` from `pull_request_target`, with `workflows: lint.yml`.
- **Lint on dispatch** `lint.yml` gets `workflow_dispatch`, so the check before the merge passes.

## 2026-11-06 Keep mise shims in each job

On self-hosted runners, a running process can keep a machine-wide mise shim open while a workflow tries to update it. This makes `mise-action` fail during setup before the job starts its checks or deploy.

- **Setup** set `MISE_SHIMS_DIR` to `runner.temp/mise-shims` for `jdx/mise-action`; keep installed tools in the shared mise data directory.
- **Trade-off** each job recreates a small shim directory, while installed tool versions remain cached on the runner.

## 2026-11-09 Week review: shims reach every step

The 2026-11-06 fix set `MISE_SHIMS_DIR` on the `jdx/mise-action` step only. A step's `env` doesn't reach later steps, so the separate `mise install` step and the caller's own steps still wrote the shared shim folder.

- **Env for the job** the first step of `actions/setup` writes `MISE_SHIMS_DIR` to `$GITHUB_ENV`, so mise-action, the install steps and the caller's steps all use the job's own shim folder.
- **Plain PowerShell** the Windows install step runs with `shell: powershell`, in place of a script written from Git Bash.
- **Lint dogfoods the action** `lint.yml` calls `./actions/setup`, so a broken setup action fails this repo's Lint first. It also runs `mise run test`, and pins `actions/checkout` to a commit.
