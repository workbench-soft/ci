# TODO

## app-audit

- [ ] Check the next Dependabot PR in an app repo merges on open, and that a commit you push to one waits for you (workbench-soft/ci#3)
- Left: rename the setup input `pnpm-install` to match `install_args`, breaks every caller
- Left: mise-action 5.2.3 to 5.2.4, the weekly Dependabot PR does it
- [ ] Check the next release on main gets one tag and one release, and a rerun of a failed release reuses its tag (job app-audit 2026-11-02)
- [ ] Decide on stopping a Dependabot merge when a listed workflow has no `workflow_dispatch`: commit `0bd1593` on the local branch `job/app-audit-2026-11-01-deps` holds it, and it would stall every caller that lists `lint.yml` until the trigger lands
- [ ] Finish or drop the uncommitted `merge-dependabot.yml`, `CHANGELOG.md`, `README.md` and `specs/shared-workflows.md` edits in `C:\Programming\WorkbenchSoft\ci-job-app-audit-2026-11-01-deps`, then remove that worktree and its branch
- [ ] Add CHANGELOG.md lines for the 2026-11-02 audit fixes once that worktree is gone: the job left the file alone
- Left: pin `actions/checkout@v7` in `lint.yml` to a commit, the file is held by the open Dependabot PR #7
- Left: `lint.yml` doesn't run `mise run test`, the file is held by the open Dependabot PR #7
