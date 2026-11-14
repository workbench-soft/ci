# TODO

## app-audit

- Left: rename the setup input `pnpm-install` to match `install_args`, breaks every caller
- Left: `gh workflow view | grep -q` under pipefail could fail on SIGPIPE, not seen on the small workflow files (app-audit 2026-11-11)
- Left: the guard that holds a Dependabot PR once a person pushes to it has no live run yet. Merge on open works: app-updater #29 and disk-reorg #10 and #11 merged by themselves (checked 2026-11-13)

## ios-apps

- [ ] First run of `ios-simulator.yml`: the servohop port calls it first. GitHub refuses macOS jobs until the billing at <https://github.com/organizations/workbench-soft/settings/billing> is fixed, see `keeppad/TODO.md` (2026-11-13)
- [ ] Check the Maestro screenshots land in the `ios-simulator` artifact on that first run, `takeScreenshot` output paths differ by version

## dispatch-token

- [ ] Make the token the Dependabot merges start Checks with (2026-11-14): open <https://github.com/settings/personal-access-tokens/new> as an org owner, resource owner `workbench-soft`, All repositories, 1 year, Repository permissions: Actions read and write. Store it in Bitwarden project `workbench-soft` as `CI_DISPATCH_TOKEN`, then set it as an org Dependabot secret for all repos: `bws run -- powershell -c 'gh secret set CI_DISPATCH_TOKEN --org workbench-soft --app dependabot --visibility all --body $env:CI_DISPATCH_TOKEN'`.
- [ ] Pass the token in each caller of `dependabot-auto-merge.yml`: add `secrets:` with `dispatch_token: ${{ secrets.CI_DISPATCH_TOKEN }}` under `with:` of the `merge` job. Done in `ci` and `property-trends`, left in the other 31 repos that call it.
