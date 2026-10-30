# TODO

## app-audit

- [ ] Check the next Dependabot PR in an app repo merges on open, and that a commit you push to one waits for you (branch audit-2026-10-30)
- [ ] mm-base: add `desktop-checks.yml` to `workflows` in `.github/workflows/dependabot-auto-merge.yml`, so it runs after a Dependabot merge
- Left: rename the setup input `pnpm-install` to match `install_args`, breaks every caller
- Left: mise-action 5.2.3 to 5.2.4, the weekly Dependabot PR does it
