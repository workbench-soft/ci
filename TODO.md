# TODO

## dependabot-smart-merge

- [ ] Put the Claude token and the dispatch token into each calling repo (login, denied): `powershell -NoProfile -ExecutionPolicy Bypass -File "$env:WBS_ROOT\ci\scripts\person-steps\dependabot-ai-secrets.ps1"`. It opens a Claude sign-in once and asks for the token it prints.

## app-audit

- Left: rename the setup input `pnpm-install` to match `install_args`, breaks every caller
- Left: `gh workflow view | grep -q` under pipefail could fail on SIGPIPE, not seen on the small workflow files (app-audit 2026-11-11)
- Left: the guard that holds a Dependabot PR once a person pushes to it has no live run yet. Merge on open works: app-updater #29 and disk-reorg #10 and #11 merged by themselves (checked 2026-11-13)

## ios-apps

- [ ] First run of `ios-simulator.yml`: the servohop port calls it first. GitHub refuses macOS jobs until the billing at <https://github.com/organizations/workbench-soft/settings/billing> is fixed, see `keeppad/TODO.md` (2026-11-13)
- [ ] Check the Maestro screenshots land in the `ios-simulator` artifact on that first run, `takeScreenshot` output paths differ by version

## dispatch-token

- [ ] Open the log of the first `dependabot-auto-merge` run that merges a minor update after 2026-11-17 07:50, and check it has no `No dispatch_token` warning and a Release or Deploy run on `workflow_run` follows. All 19 callers hold `CI_DISPATCH_TOKEN` as a repo Dependabot secret since 2026-11-17, and `DISPATCH_TOKEN` showed empty on the 2026-11-16 runs, when only the org secret held it (wait)
