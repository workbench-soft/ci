# TODO

## app-audit

- [ ] Check the next Dependabot PR in an app repo merges on open, and that a commit you push to one waits for you (workbench-soft/ci#3)
- Left: rename the setup input `pnpm-install` to match `install_args`, breaks every caller
- Left: mise-action 5.2.3 to 5.2.4, the weekly Dependabot PR does it
- [ ] Check the next release on main gets one tag and one release, and a rerun of a failed release reuses its tag (job app-audit 2026-11-02)
- Left: pin `actions/checkout@v7` in `lint.yml` to a commit, the file is held by the open Dependabot PR #7
- Left: `lint.yml` doesn't run `mise run test`, the file is held by the open Dependabot PR #7
