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

## 2026-11-10 Dependabot merges dispatch the new release shape

The app repos moved Release to `release-gate.sh`, which ties the build to Checks of the same commit. `dependabot-auto-merge.yml` looked only for `wait-for-checks.sh`, so a Dependabot merge in such a repo started Checks with no Release build beside them.

- **Paired release** the job dispatches a push release workflow that calls `wait-for-checks.sh` or `release-gate.sh`, when its `CHECKS_WORKFLOW` is one of the listed checks.

## 2026-11-10 Copy packages on the PC runners

`expo export` in memories and tickalot failed with `EBUSY: resource busy or locked, open '...node_modules\...'` on NIFELHEIM-1 to 8. Each `node_modules` file was a hardlink into the one pnpm store at `%LOCALAPPDATA%\pnpm\store`, so each file had up to 160 links: 8 runners, their `_trash-*` folders and the dev clones. A delete of any one link makes a read through another link fail for a moment. A test read 20 files in a loop while `rd /s /q` removed their other links, and 3210 of 210,000 reads failed with `EBUSY`. Since the disk fell under 60 GB on 2026-11-09, each job start deletes the other checkouts of its runner, so these deletes run all day.

- **Copy on Windows** `actions/setup` runs `pnpm install` with `package-import-method=copy` on Windows. A checkout then owns its files, and a delete elsewhere can't lock them. macOS and Linux keep the default.
- **Store of the runners** copy alone failed in memories run 42686695102: `ERR_PNPM_EBUSY ... copyfile` from the shared store, whose files the old checkouts still link. The runners use `C:ci_pnpm-store`, beside the work folders. Its files get no other link, since every job copies. The action writes `pnpm_config_store_dir` and `pnpm_config_package_import_method` to `$GITHUB_ENV`, since pnpm in later steps refuses a store other than the install's.
- **Old checkouts** a `node_modules` without the `.ci-store` marker still holds hardlinks. The action moves it to `_trash-<time>-node_modules-<repo>` beside the checkouts, where the job start hook of local-ci deletes it, and installs anew.
- **Cost** a cold install copies about 1.4 GB for memories, in place of links, and the new store downloads each package once. A warm install checks the folder only, as before.

## 2026-11-14 Dispatch the checks with a token that chains

A Dependabot merge dispatched Checks with the workflow token. GitHub fires no `workflow_run` for a run that token starts, so a Release or Deploy web on `workflow_run` of Checks never followed: property-trends Checks for `2e20139` passed on 2026-11-11 with no Release after them.

- **Token** `dependabot-auto-merge.yml` takes an optional `dispatch_token` secret and starts the listed workflows with it. A run started by that token fires `workflow_run`, so the follow-up workflows run.
- **Secret** callers pass `CI_DISPATCH_TOKEN`, a Dependabot secret in each calling repo, since a run Dependabot starts reads Dependabot secrets only. It is a fine-grained token on every repo of the org with Actions read and write. The merge still takes the workflow token. An org secret reaches no private repo on the Free plan, so the merge runs of 2026-11-16 got an empty token.
- **Fallback** without the secret the job dispatches with the workflow token, as before, and a warning names the gap.
- **Dispatching Release instead** was dropped. Release run by hand looks up Checks once and fails while they run, and a Release the workflow token starts fires no Deploy web either.

## 2026-11-17 Affected: run only what a push changed

A docs push still cut a release, and a change to one package of memories started the checks and the release of each app. The plan for every repo sits in `specs/affected-ci.md` of the `workspace` repo.

- **Step** `actions/affected` runs `scripts/affected.ts`, which says whether a product of the repo changed since a base. It writes `run`, `all`, `base`, `packages` and `filter` as step outputs, and the reason to the job summary.
- **Base** `since: checks` takes the newest green run of the same workflow on `main` whose commit is an ancestor of `HEAD`, so commits of a cancelled run still count. `since: release` takes the last tag that matches `tag`.
- **Graph** in a pnpm workspace, `pnpm list -r --filter "...[<base>]"` gives each changed package and each package that depends on it.
- **Safe side** a run by hand, no base, a change to the lockfile, `mise.toml`, the root `package.json`, `.github/actions/**` or the running workflow, and a file that no package or product owns each give `all=true`.
- **Config** a repo with several products lists them in `.github/affected.json`, each with `packages`, `paths` and `tag`. A repo with one product needs none.
- **Own release** `release.yml` of this repo runs the step with `since: release`, so a push with no change outside Markdown since the last tag cuts no release.
