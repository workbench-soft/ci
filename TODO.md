# TODO

## app-audit

- Left: rename the setup input `pnpm-install` to match `install_args`, breaks every caller
- Left: `gh workflow view | grep -q` under pipefail could fail on SIGPIPE, not seen on the small workflow files (app-audit 2026-11-11)
- Left: the guard that holds a Dependabot PR once a person pushes to it has no live run yet. Merge on open works: app-updater #29 and disk-reorg #10 and #11 merged by themselves (checked 2026-11-13)

## ios-apps

- [ ] First run of `ios-simulator.yml`: the servohop port calls it first. GitHub refuses macOS jobs until the billing at <https://github.com/organizations/workbench-soft/settings/billing> is fixed, see `keeppad/TODO.md` (2026-11-13)
- [ ] Check the Maestro screenshots land in the `ios-simulator` artifact on that first run, `takeScreenshot` output paths differ by version
